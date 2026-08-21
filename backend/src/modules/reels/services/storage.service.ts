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
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    this.bucketName = this.configService.get<string>(
      'S3_BUCKET_NAME',
      'vastu-video',
    );
    this.clientEndpoint = this.configService.get<string>('S3_CLIENT_ENDPOINT');

    this.s3Client = new S3Client({
      endpoint: endpoint || undefined,
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
      forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async onModuleInit() {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      console.log(`S3 bucket "${this.bucketName}" already exists.`);
    } catch (err: any) {
      const isNotFound =
        err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404;
      if (isNotFound) {
        try {
          await this.s3Client.send(
            new CreateBucketCommand({ Bucket: this.bucketName }),
          );
          console.log(`S3 bucket "${this.bucketName}" created successfully.`);
        } catch (createErr) {
          console.warn(
            `Failed to automatically create S3 bucket "${this.bucketName}":`,
            createErr,
          );
        }
      } else {
        console.warn(
          `Error checking S3 bucket "${this.bucketName}" existence:`,
          err,
        );
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
      console.log(
        `Configured public read policy on bucket "${this.bucketName}".`,
      );
    } catch (policyErr) {
      console.warn(
        `Failed to set public bucket policy on "${this.bucketName}":`,
        policyErr,
      );
    }
  }

  /**
   * Checks if an endpoint is local/emulator/docker rather than a public cloud S3 provider.
   */
  private isLocalEndpoint(endpointUrl?: string): boolean {
    if (!endpointUrl) return false;
    try {
      const parsed = new URL(endpointUrl);
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === 'minio' ||
        host === '10.0.2.2' ||
        host === 'host.docker.internal'
      );
    } catch {
      return false;
    }
  }

  /**
   * Adapts a local S3/MinIO endpoint hostname to match the incoming client request host
   * (e.g. Android 10.0.2.2, LAN IP 192.168.x.x, or public server IP), while preserving port.
   */
  private resolveClientEndpoint(
    baseEndpointUrl?: string,
    requestHost?: string,
  ): string | undefined {
    if (!baseEndpointUrl) return undefined;
    if (!this.isLocalEndpoint(baseEndpointUrl) || !requestHost) {
      return baseEndpointUrl;
    }

    try {
      const parsedBase = new URL(baseEndpointUrl);
      const requestHostClean = requestHost.includes('://')
        ? requestHost
        : `http://${requestHost}`;
      const parsedRequest = new URL(requestHostClean);

      // If base is local MinIO/docker, adapt hostname to match incoming caller's IP/hostname
      parsedBase.hostname = parsedRequest.hostname;
      return parsedBase.toString().replace(/\/$/, '');
    } catch {
      return baseEndpointUrl;
    }
  }

  /**
   * Generates a pre-signed URL for direct client-side uploads.
   * Dynamically adapts local MinIO endpoints for emulators/devices while keeping cloud R2/S3 endpoints untouched.
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
    const configuredEndpoint = this.configService.get<string>('S3_ENDPOINT');
    let signEndpoint = this.clientEndpoint || configuredEndpoint;

    // Only adapt hostname if it is a local MinIO / Docker endpoint
    if (this.isLocalEndpoint(signEndpoint)) {
      signEndpoint = this.resolveClientEndpoint(signEndpoint, requestHost);
    }

    // 2. Instantiate temporary S3 client with the client-accessible endpoint
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    const signingClient = new S3Client({
      endpoint: signEndpoint || undefined,
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
      forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    // 3. Generate signed URL
    const url = await getSignedUrl(signingClient, command, {
      expiresIn: expiresInSeconds,
    });

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
  async uploadFile(
    localFilePath: string,
    key: string,
    mimeType: string,
  ): Promise<string> {
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
    const cleanKey = key.replace(/^\/+/, '');

    // 1. If CDN_URL is configured (e.g. Cloudflare R2 public domain / custom domain), prioritize it
    const cdnUrl = this.configService.get<string>('CDN_URL');
    if (cdnUrl) {
      const cleanCdn = cdnUrl.replace(/\/+$/, '');
      return `${cleanCdn}/${cleanKey}`;
    }

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    if (endpoint) {
      let baseEndpoint = this.clientEndpoint || endpoint;

      // Only adapt hostname if it is a local MinIO / Docker endpoint
      if (this.isLocalEndpoint(baseEndpoint)) {
        baseEndpoint =
          this.resolveClientEndpoint(baseEndpoint, requestHost) || baseEndpoint;
      }

      const forcePathStyle =
        this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';
      if (forcePathStyle) {
        const cleanBase = baseEndpoint.replace(/\/+$/, '');
        return `${cleanBase}/${this.bucketName}/${cleanKey}`;
      } else {
        const parsed = new URL(baseEndpoint);
        const basePath = parsed.pathname === '/' ? '' : parsed.pathname;
        return `${parsed.protocol}//${this.bucketName}.${parsed.host}${basePath}/${cleanKey}`;
      }
    }

    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
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
      console.log(
        `Deleted folder prefix ${prefix} from bucket ${this.bucketName}`,
      );
    } catch (err) {
      console.error(`Failed to delete folder prefix ${prefix}:`, err);
    }
  }
}
