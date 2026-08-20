import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { Reel, ReelStatus, ReelVisibility } from '../entities/reel.entity';
import { ReelMedia } from '../entities/reel-media.entity';
import { ReelUpload, UploadStatus } from '../entities/reel-upload.entity';
import { ReelLike } from '../entities/reel-like.entity';
import { ReelComment } from '../entities/reel-comment.entity';
import { ReelView } from '../entities/reel-view.entity';
import { ReelBookmark } from '../entities/reel-bookmark.entity';
import { StorageService } from './storage.service';
import { InitUploadDto, CreateCommentDto, FeedQueryDto } from '../dto/reels.dto';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];

@Injectable()
export class ReelsService {
  constructor(
    @InjectRepository(Reel)
    private readonly reelRepository: Repository<Reel>,
    @InjectRepository(ReelMedia)
    private readonly mediaRepository: Repository<ReelMedia>,
    @InjectRepository(ReelUpload)
    private readonly uploadRepository: Repository<ReelUpload>,
    @InjectRepository(ReelLike)
    private readonly likeRepository: Repository<ReelLike>,
    @InjectRepository(ReelComment)
    private readonly commentRepository: Repository<ReelComment>,
    @InjectRepository(ReelView)
    private readonly viewRepository: Repository<ReelView>,
    @InjectRepository(ReelBookmark)
    private readonly bookmarkRepository: Repository<ReelBookmark>,
    @InjectQueue('video-processing')
    private readonly videoQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Initializes a Reel upload: creates the database record and generates a presigned S3 upload URL.
   */
  async initUpload(userId: string, dto: InitUploadDto, requestHost?: string) {
    // 1. Validation
    if (dto.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds the limit of 500MB.`);
    }
    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(`Unsupported MIME type. Allowed formats: MP4, MOV, MKV, WebM.`);
    }

    // 2. Create the Reel record (in UPLOADING status)
    const reel = this.reelRepository.create({
      userId,
      title: dto.title,
      caption: dto.caption || '',
      category: dto.category || 'general',
      subCategory: dto.subCategory || '',
      propertyType: dto.propertyType || '',
      element: dto.element || '',
      location: dto.location || '',
      status: ReelStatus.UPLOADING,
      visibility: ReelVisibility.PUBLIC,
    });
    const savedReel = await this.reelRepository.save(reel);

    // 3. Generate unique storage key
    const extension = dto.fileName.split('.').pop() || 'mp4';
    const storageKey = `reels/uploads/${savedReel.id}/original.${extension}`;

    // 4. Create the ReelUpload tracker
    const upload = this.uploadRepository.create({
      id: savedReel.id, // match Reel ID for convenience
      userId,
      storageKey,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      mimeType: dto.mimeType,
      status: UploadStatus.UPLOADING,
    });
    await this.uploadRepository.save(upload);

    // 5. Generate signed upload URL
    const uploadUrl = await this.storageService.getPresignedUploadUrl(storageKey, dto.mimeType, 900, requestHost);

    return {
      uploadId: savedReel.id,
      uploadUrl,
      storageKey,
      expiresIn: 900,
    };
  }

  /**
   * Completes the upload flow: verifies object existence in storage and queues transcoding.
   */
  async completeUpload(userId: string, uploadId: string) {
    const upload = await this.uploadRepository.findOne({ where: { id: uploadId } });
    if (!upload) {
      throw new NotFoundException('Upload session not found.');
    }
    if (upload.userId !== userId) {
      throw new ForbiddenException('You do not own this upload session.');
    }
    if (upload.status !== UploadStatus.UPLOADING) {
      throw new BadRequestException(`Upload is already in state: ${upload.status}`);
    }

    // Verify object exists in storage
    const s3Meta = await this.storageService.getObjectMetadata(upload.storageKey);
    if (!s3Meta.exists) {
      throw new BadRequestException('File not found in storage. Ensure direct upload completed.');
    }

    // Update upload status
    upload.status = UploadStatus.COMPLETED;
    await this.uploadRepository.save(upload);

    // Create ReelMedia record link
    const media = this.mediaRepository.create({
      reelId: uploadId,
      originalKey: upload.storageKey,
      fileSize: s3Meta.contentLength || upload.fileSize,
      mimeType: s3Meta.contentType || upload.mimeType,
    });
    await this.mediaRepository.save(media);

    // Set Reel status to PROCESSING
    const reel = await this.reelRepository.findOne({ where: { id: uploadId } });
    if (!reel) {
      throw new NotFoundException('Reel metadata record not found.');
    }
    reel.status = ReelStatus.PROCESSING;
    await this.reelRepository.save(reel);

    // Queue background transcoding job
    const job = await this.videoQueue.add(
      'process-video',
      {
        reelId: reel.id,
        uploadId: upload.id,
        storageKey: upload.storageKey,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(`Queued video-processing job ${job.id} for Reel ${reel.id}`);

    return {
      reelId: reel.id,
      status: ReelStatus.PROCESSING,
    };
  }

  /**
   * Fetches paginated feed of READY reels, including creator data and user states.
   */
  async getFeed(userId: string | null, query: FeedQueryDto, requestHost?: string) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.reelRepository.createQueryBuilder('reel')
      .leftJoinAndSelect('reel.user', 'creator')
      .leftJoinAndSelect('reel.media', 'media')
      .where('reel.status = :status', { status: ReelStatus.READY })
      .andWhere('reel.visibility = :visibility', { visibility: ReelVisibility.PUBLIC });

    if (query.category) {
      qb.andWhere('reel.category = :category', { category: query.category });
    }
    if (query.element) {
      qb.andWhere('reel.element = :element', { element: query.element });
    }
    if (query.userId) {
      qb.andWhere('reel.userId = :userId', { userId: query.userId });
    }

    qb.orderBy('reel.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [reels, total] = await qb.getManyAndCount();

    // Map feeds with stats and user-specific flags
    const items = await Promise.all(
      reels.map(async (reel) => {
        const likesCount = await this.likeRepository.count({ where: { reelId: reel.id } });
        const commentsCount = await this.commentRepository.count({ where: { reelId: reel.id } });

        let isLiked = false;
        let isBookmarked = false;

        if (userId) {
          isLiked = await this.likeRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
          isBookmarked = await this.bookmarkRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
        }

        // Formulate streaming paths
        const videoUrl = reel.media?.hlsKey ? this.storageService.getObjectUrl(reel.media.hlsKey, requestHost) : null;
        const thumbnailUrl = reel.media?.thumbnailKey ? this.storageService.getObjectUrl(reel.media.thumbnailKey, requestHost) : null;

        return {
          id: reel.id,
          title: reel.title,
          caption: reel.caption,
          category: reel.category,
          subCategory: reel.subCategory,
          propertyType: reel.propertyType,
          element: reel.element,
          location: reel.location,
          createdAt: reel.createdAt,
          likesCount,
          commentsCount,
          viewsCount: String(reel.viewsCount),
          videoUrl,
          thumbnailUrl,
          isLiked,
          isBookmarked,
          mediaUrls: thumbnailUrl ? [thumbnailUrl] : [],
          creator: {
            id: reel.user?.id || 'c_unknown',
            name: reel.user?.name || 'Vastu Advisor',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            isVerified: true,
            title: 'Certified Consultant',
          },
        };
      })
    );

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves metadata of a single Reel.
   */
  async getById(id: string, userId: string | null, requestHost?: string) {
    const reel = await this.reelRepository.findOne({
      where: { id },
      relations: { user: true, media: true },
    });

    if (!reel || reel.status === ReelStatus.DELETED) {
      throw new NotFoundException('Reel not found.');
    }

    const likesCount = await this.likeRepository.count({ where: { reelId: reel.id } });
    const commentsCount = await this.commentRepository.count({ where: { reelId: reel.id } });

    let isLiked = false;
    let isBookmarked = false;

    if (userId) {
      isLiked = await this.likeRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
      isBookmarked = await this.bookmarkRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
    }

    const videoUrl = reel.media?.hlsKey ? this.storageService.getObjectUrl(reel.media.hlsKey, requestHost) : null;
    const thumbnailUrl = reel.media?.thumbnailKey ? this.storageService.getObjectUrl(reel.media.thumbnailKey, requestHost) : null;

    return {
      id: reel.id,
      title: reel.title,
      caption: reel.caption,
      category: reel.category,
      subCategory: reel.subCategory,
      propertyType: reel.propertyType,
      element: reel.element,
      location: reel.location,
      createdAt: reel.createdAt,
      likesCount,
      commentsCount,
      viewsCount: String(reel.viewsCount),
      videoUrl,
      thumbnailUrl,
      isLiked,
      isBookmarked,
      mediaUrls: thumbnailUrl ? [thumbnailUrl] : [],
      creator: {
        id: reel.user?.id || 'c_unknown',
        name: reel.user?.name || 'Vastu Advisor',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        title: 'Certified Consultant',
      },
    };
  }

  /**
   * Deletes a Reel by ID (soft delete + triggers folder deletion in S3).
   */
  async deleteReel(userId: string, id: string) {
    const reel = await this.reelRepository.findOne({ where: { id } });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }
    if (reel.userId !== userId) {
      throw new ForbiddenException('You do not own this reel.');
    }

    reel.status = ReelStatus.DELETED;
    await this.reelRepository.save(reel);

    // Asynchronously delete assets in storage
    const s3Prefix = `reels/${id}`;
    this.storageService.deleteFolder(s3Prefix).catch((err) => {
      console.error(`Failed to delete S3 folder for Reel ${id}:`, err);
    });

    return { success: true };
  }

  /**
   * Likes a Reel.
   */
  async likeReel(userId: string, reelId: string) {
    const reel = await this.reelRepository.findOne({ where: { id: reelId } });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    const existing = await this.likeRepository.findOne({ where: { reelId, userId } });
    if (!existing) {
      const like = this.likeRepository.create({ reelId, userId });
      await this.likeRepository.save(like);
    }
    return { success: true };
  }

  /**
   * Unlikes a Reel.
   */
  async unlikeReel(userId: string, reelId: string) {
    const existing = await this.likeRepository.findOne({ where: { reelId, userId } });
    if (existing) {
      await this.likeRepository.remove(existing);
    }
    return { success: true };
  }

  /**
   * Bookmarks a Reel.
   */
  async bookmarkReel(userId: string, reelId: string) {
    const reel = await this.reelRepository.findOne({ where: { id: reelId } });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    const existing = await this.bookmarkRepository.findOne({ where: { reelId, userId } });
    if (!existing) {
      const bookmark = this.bookmarkRepository.create({ reelId, userId });
      await this.bookmarkRepository.save(bookmark);
    }
    return { success: true };
  }

  /**
   * Unbookmarks a Reel.
   */
  async unbookmarkReel(userId: string, reelId: string) {
    const existing = await this.bookmarkRepository.findOne({ where: { reelId, userId } });
    if (existing) {
      await this.bookmarkRepository.remove(existing);
    }
    return { success: true };
  }

  /**
   * Adds a Comment to a Reel.
   */
  async addComment(userId: string, reelId: string, dto: CreateCommentDto) {
    const reel = await this.reelRepository.findOne({ where: { id: reelId } });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    const comment = this.commentRepository.create({
      reelId,
      userId,
      text: dto.text,
      parentId: dto.parentId || undefined,
    });

    const saved = await this.commentRepository.save(comment);

    // Fetch comment with user relation
    return this.commentRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });
  }

  /**
   * Gets comments list of a Reel.
   */
  async getComments(reelId: string) {
    const comments = await this.commentRepository.find({
      where: { reelId, parentId: IsNull() },
      relations: { user: true, replies: { user: true } },
      order: { createdAt: 'ASC' },
    });

    return comments.map((c) => this.mapComment(c));
  }

  private mapComment(c: ReelComment): any {
    return {
      id: c.id,
      userName: c.user?.name || 'Vastu User',
      userAvatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      commentText: c.text,
      timestamp: c.createdAt.toISOString(),
      likesCount: 0,
      isLiked: false,
      replies: c.replies ? c.replies.map((r) => this.mapComment(r)) : [],
    };
  }

  /**
   * Increments the view count of a Reel.
   */
  async recordView(reelId: string, userId: string | null, ipAddress?: string) {
    const reel = await this.reelRepository.findOne({ where: { id: reelId } });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    // Add view entry
    const view = this.viewRepository.create({
      reelId,
      userId: userId || undefined,
      ipAddress,
    });
    await this.viewRepository.save(view);

    // Increment count
    reel.viewsCount += 1;
    await this.reelRepository.save(reel);

    return { viewsCount: reel.viewsCount };
  }
}
