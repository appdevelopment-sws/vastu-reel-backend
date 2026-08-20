import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly clientEndpoint?: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
    const forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'vastu-reels');
    this.clientEndpoint = this.configService.get<string>('S3_CLIENT_ENDPOINT');

    this.s3Client = new S3Client({
      endpoint: endpoint || undefined,
      region,
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
      forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async onModuleInit() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`S3 bucket "${this.bucketName}" already exists.`);
    } catch (err: any) {
      const isNotFound = err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404;
      if (isNotFound) {
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          console.log(`S3 bucket "${this.bucketName}" created successfully.`);
        } catch (createErr) {
          console.warn(`Failed to automatically create S3 bucket "${this.bucketName}":`, createErr);
        }
      } else {
        console.warn(`Error checking S3 bucket "${this.bucketName}" existence:`, err);
      }
    }

    // Ensure bucket has public read policy so thumbnails and HLS video chunks stream openly
    try {
      const publicReadPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      });
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: publicReadPolicy,
        }),
      );
      console.log(`Configured public read policy on bucket "${this.bucketName}".`);
    } catch (policyErr) {
      console.warn(`Failed to set public bucket policy on "${this.bucketName}":`, policyErr);
    }
  }

  /**
   * Generates a pre-signed URL for direct client-side uploads.
   * Rewrites hostname if S3_CLIENT_ENDPOINT is configured to support local emulator testing.
   */
  async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds = 900,
    requestHost?: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    // 1. Determine S3 endpoint to sign with
    let signEndpoint = this.configService.get<string>('S3_ENDPOINT');
    if (this.clientEndpoint) {
      try {
        const parsedClient = new URL(this.clientEndpoint);
        if (requestHost) {
          const parsedRequest = requestHost.includes('://') ? new URL(requestHost) : new URL(`http://${requestHost}`);
          if (parsedRequest.hostname === '10.0.2.2') {
            parsedClient.hostname = '10.0.2.2';
          }
        }
        signEndpoint = parsedClient.toString();
      } catch (err) {
        console.error('Failed to parse endpoint for S3 signing client:', err);
      }
    }

    // 2. Instantiate temporary S3 client with the client-accessible endpoint
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
    const forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    const signingClient = new S3Client({
      endpoint: signEndpoint || undefined,
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey,
      } : undefined,
      forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    // 3. Generate signed URL
    const url = await getSignedUrl(signingClient, command, { expiresIn: expiresInSeconds });

    // Clean up
    signingClient.destroy();

    return url;
  }

  /**
   * Check if an object exists and retrieve its metadata.
   */
  async getObjectMetadata(key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return {
        exists: true,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false, contentLength: 0, contentType: null };
      }
      throw err;
    }
  }

  /**
   * Downloads an object from S3 to a local file path.
   */
  async downloadObject(key: string, localFilePath: string): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as Readable;

    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(localFilePath);
      stream
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', (err) => {
          fs.unlink(localFilePath, () => {});
          reject(err);
        });
    });
  }

  /**
   * Uploads a local file to S3.
   */
  async uploadFile(localFilePath: string, key: string, mimeType: string): Promise<string> {
    const fileStream = fs.createReadStream(localFilePath);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileStream,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
    return this.getObjectUrl(key);
  }

  /**
   * Gets a public/direct URL for an object key.
   */
  getObjectUrl(key: string, requestHost?: string): string {
    const cdnUrl = this.configService.get<string>('CDN_URL');
    if (cdnUrl) {
      return `${cdnUrl}/${key}`;
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (endpoint) {
      let baseEndpoint = this.clientEndpoint || endpoint;
      if (requestHost) {
        try {
          const parsedRequest = requestHost.includes('://') ? new URL(requestHost) : new URL(`http://${requestHost}`);
          const parsedBase = new URL(baseEndpoint);
          if (parsedRequest.hostname === '10.0.2.2') {
            parsedBase.hostname = '10.0.2.2';
            baseEndpoint = parsedBase.toString().replace(/\/$/, '');
          }
        } catch (_) {}
      }

      const forcePathStyle = this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';
      if (forcePathStyle) {
        return `${baseEndpoint}/${this.bucketName}/${key}`;
      } else {
        const parsed = new URL(baseEndpoint);
        return `${parsed.protocol}//${this.bucketName}.${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}/${key}`;
      }
    }

    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Deletes all objects with a specific prefix (folder) from the bucket.
   */
  async deleteFolder(prefix: string): Promise<void> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const listResponse = await this.s3Client.send(listCommand);
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return;
      }

      const objectsToDelete = listResponse.Contents.map((item) => ({
        Key: item.Key,
      }));

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete,
          Quiet: true,
        },
      });

      await this.s3Client.send(deleteCommand);
      console.log(`Deleted folder prefix ${prefix} from bucket ${this.bucketName}`);
    } catch (err) {
      console.error(`Failed to delete folder prefix ${prefix}:`, err);
    }
  }
}
