import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reel, ReelStatus } from './entities/reel.entity';
import { ReelMedia } from './entities/reel-media.entity';
import { StorageService } from './services/storage.service';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Processor('video-processing')
export class ReelsProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Reel)
    private readonly reelRepository: Repository<Reel>,
    @InjectRepository(ReelMedia)
    private readonly mediaRepository: Repository<ReelMedia>,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { reelId, storageKey } = job.data;
    console.log(`Processing Reel video: id=${reelId}, originalKey=${storageKey}`);
    const reel = await this.reelRepository.findOne({
      where: { id: reelId },
      relations: { media: true },
    });

    if (!reel) {
      console.error(`Reel ${reelId} not found in database. Aborting.`);
      return;
    }

    // Set status to PROCESSING
    reel.status = ReelStatus.PROCESSING;
    await this.reelRepository.save(reel);

    // Set up temp workspace paths
    const tempDir = path.join('/tmp', `transcode-${reelId}`);
    const inputFilePath = path.join(tempDir, 'original.mp4');
    const localHlsDir = path.join(tempDir, 'hls');

    try {
      // 1. Clean workspace and download original file
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(localHlsDir, { recursive: true });

      console.log(`Downloading original video to ${inputFilePath}...`);
      await this.storageService.downloadObject(storageKey, inputFilePath);

      // 2. Validate & Extract metadata using ffprobe
      console.log(`Analyzing video dimensions and metadata...`);
      const { stdout: ffprobeOut } = await execPromise(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json "${inputFilePath}"`,
      );
      const metadata = JSON.parse(ffprobeOut);
      const stream = metadata.streams?.[0];
      const duration = stream?.duration ? parseFloat(stream.duration) : 0.0;
      const width = stream?.width ? parseInt(stream.width) : 720;
      const height = stream?.height ? parseInt(stream.height) : 1280;

      console.log(`Video analysis: ${width}x${height}, duration=${duration}s`);

      // 3. Generate thumbnail at 1s offset (or start if shorter)
      const thumbnailLocalPath = path.join(tempDir, 'thumbnail.jpg');
      const startOffset = duration > 1 ? '00:00:01' : '00:00:00';
      console.log(`Generating thumbnail...`);
      await execPromise(
        `ffmpeg -y -ss ${startOffset} -i "${inputFilePath}" -vframes 1 -q:v 2 -vf "scale='min(720,iw)':-2" "${thumbnailLocalPath}"`,
      );

      // 4. Generate HLS Variant Playlists
      const variants: { resolution: string; playlistPath: string; bandwidth: number; width: number; height: number }[] = [];

      // 360p - Low Quality (always generate)
      const p360Dir = path.join(localHlsDir, '360p');
      fs.mkdirSync(p360Dir, { recursive: true });
      console.log(`Transcoding 360p playlist...`);
      await execPromise(
        `ffmpeg -y -i "${inputFilePath}" -vf "scale=-2:640" -c:v libx264 -profile:v baseline -level 3.0 -c:a aac -ac 2 -b:a 96k -b:v 800k -maxrate 850k -bufsize 1200k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${p360Dir}/segment%03d.ts" "${p360Dir}/playlist.m3u8"`,
      );
      variants.push({
        resolution: '360p',
        playlistPath: '360p/playlist.m3u8',
        bandwidth: 900000,
        width: 360,
        height: 640,
      });

      // 720p - High Quality (only if input is at least 720p height or width)
      const maxDim = Math.max(width, height);
      if (maxDim >= 720) {
        const p720Dir = path.join(localHlsDir, '720p');
        fs.mkdirSync(p720Dir, { recursive: true });
        console.log(`Transcoding 720p playlist...`);
        // Using -vf "scale=-2:1280" for vertical video, or check orientation
        const targetScale = height >= width ? 'scale=-2:1280' : 'scale=1280:-2';
        await execPromise(
          `ffmpeg -y -i "${inputFilePath}" -vf "${targetScale}" -c:v libx264 -profile:v main -level 3.1 -c:a aac -ac 2 -b:a 128k -b:v 2500k -maxrate 2600k -bufsize 4000k -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${p720Dir}/segment%03d.ts" "${p720Dir}/playlist.m3u8"`,
        );
        variants.push({
          resolution: '720p',
          playlistPath: '720p/playlist.m3u8',
          bandwidth: 2800000,
          width: height >= width ? 720 : 1280,
          height: height >= width ? 1280 : 720,
        });
      }

      // 5. Create Master Playlist
      const masterPath = path.join(localHlsDir, 'master.m3u8');
      let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
      for (const variant of variants) {
        masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}\n${variant.playlistPath}\n`;
      }
      fs.writeFileSync(masterPath, masterContent);

      // 6. Upload generated files to S3/R2
      console.log(`Uploading transcoding outputs to object storage...`);
      const s3Prefix = `reels/${reelId}`;

      // Upload thumbnail
      const thumbnailKey = `${s3Prefix}/thumbnail.jpg`;
      await this.storageService.uploadFile(thumbnailLocalPath, thumbnailKey, 'image/jpeg');

      // Upload HLS directory recursively
      await this.uploadDirectory(localHlsDir, `${s3Prefix}/hls`);

      // 7. Update MySQL Database Metadata
      let media = reel.media;
      if (!media) {
        media = new ReelMedia();
        media.reelId = reelId;
      }
      media.originalKey = storageKey;
      media.hlsKey = `${s3Prefix}/hls/master.m3u8`;
      media.thumbnailKey = thumbnailKey;
      media.duration = duration;
      media.width = width;
      media.height = height;
      // Fetch exact original file size
      const originalMeta = await this.storageService.getObjectMetadata(storageKey);
      media.fileSize = originalMeta.contentLength || 0;
      media.mimeType = originalMeta.contentType || 'video/mp4';

      await this.mediaRepository.save(media);

      reel.status = ReelStatus.READY;
      await this.reelRepository.save(reel);

      console.log(`Reel ${reelId} processed successfully! Status set to READY.`);
    } catch (err: any) {
      console.error(`Error processing video for Reel ${reelId}:`, err);
      reel.status = ReelStatus.FAILED;
      await this.reelRepository.save(reel);
      throw err; // throw to let BullMQ handle retries
    } finally {
      // Clean up workspace
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.error('Failed to clean up temp files:', cleanupErr);
      }
    }
  }

  private async uploadDirectory(localDir: string, s3Prefix: string): Promise<void> {
    const listFilesRecursive = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(listFilesRecursive(filePath));
        } else {
          results.push(filePath);
        }
      }
      return results;
    };

    const files = listFilesRecursive(localDir);
    for (const file of files) {
      const relativePath = path.relative(localDir, file);
      const s3Key = path.join(s3Prefix, relativePath).replace(/\\/g, '/');

      let mimeType = 'application/octet-stream';
      if (file.endsWith('.m3u8')) {
        mimeType = 'application/vnd.apple.mpegurl';
      } else if (file.endsWith('.ts')) {
        mimeType = 'video/MP2T';
      } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }

      await this.storageService.uploadFile(file, s3Key, mimeType);
    }
  }
}
