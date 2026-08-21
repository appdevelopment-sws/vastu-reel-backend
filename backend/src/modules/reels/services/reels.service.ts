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
import { ReelCommentLike } from '../entities/reel-comment-like.entity';
import { ReelView } from '../entities/reel-view.entity';
import { ReelBookmark } from '../entities/reel-bookmark.entity';
import { User } from '../../users/entities/user.entity';
import { Follow } from '../../follows/entities/follow.entity';
import { StorageService } from './storage.service';
import { InitUploadDto, CreateCommentDto, CommentQueryDto, FeedQueryDto } from '../dto/reels.dto';
import { ActivityLogService } from '../../activity-logs/activity-log.service';
import { ActivityLogType } from '../../activity-logs/entities/activity-log.entity';

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
    @InjectRepository(ReelCommentLike)
    private readonly commentLikeRepository: Repository<ReelCommentLike>,
    @InjectRepository(ReelView)
    private readonly viewRepository: Repository<ReelView>,
    @InjectRepository(ReelBookmark)
    private readonly bookmarkRepository: Repository<ReelBookmark>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectQueue('video-processing')
    private readonly videoQueue: Queue,
    private readonly storageService: StorageService,
    private readonly activityLogService: ActivityLogService,
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
    const reel = await this.reelRepository.findOne({ where: { id: uploadId }, relations: { user: true } });
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

    // Log global activity: new reel published
    await this.activityLogService.log({
      type: ActivityLogType.REEL_PUBLISHED,
      actorId: userId,
      reelId: reel.id,
      message: `${reel.user?.name ?? 'A creator'} published a new reel: "${reel.title}"`,
      isGlobal: true,
      metadata: { title: reel.title, actorName: reel.user?.name },
    });

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
    if (query.liked && userId) {
      qb.innerJoin('reel.likes', 'userLike', 'userLike.userId = :likeUserId', { likeUserId: userId });
    }
    if (query.saved && userId) {
      qb.innerJoin('reel.bookmarks', 'userBookmark', 'userBookmark.userId = :bookmarkUserId', { bookmarkUserId: userId });
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
        let isFollowingCreator = false;

        if (userId) {
          isLiked = await this.likeRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
          isBookmarked = await this.bookmarkRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
          if (reel.userId) {
            isFollowingCreator = await this.followRepository.count({ where: { followerId: userId, followingId: reel.userId } }).then(c => c > 0);
          }
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
            username: reel.user?.username || null,
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            isVerified: true,
            title: 'Certified Consultant',
            isFollowing: isFollowingCreator,
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
    let isFollowingCreator = false;

    if (userId) {
      isLiked = await this.likeRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
      isBookmarked = await this.bookmarkRepository.count({ where: { reelId: reel.id, userId } }).then(c => c > 0);
      if (reel.userId) {
        isFollowingCreator = await this.followRepository.count({ where: { followerId: userId, followingId: reel.userId } }).then(c => c > 0);
      }
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
        username: reel.user?.username || null,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        isVerified: true,
        title: 'Certified Consultant',
        isFollowing: isFollowingCreator,
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
    const reel = await this.reelRepository.findOne({
      where: { id: reelId },
      relations: { user: true },
    });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    const existing = await this.likeRepository.findOne({ where: { reelId, userId } });
    if (!existing) {
      const like = this.likeRepository.create({ reelId, userId });
      await this.likeRepository.save(like);

      // Log like activity (personal — only reel owner sees it)
      if (reel.userId !== userId) {
        await this.activityLogService.log({
          type: ActivityLogType.LIKE,
          actorId: userId,
          targetUserId: reel.userId,
          reelId,
          message: `Someone liked your reel "${reel.title}".`,
          isGlobal: false,
          metadata: { reelId, reelTitle: reel.title },
        });
      }
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
   * Adds a Comment or Reply to a Reel (strictly enforces max 2-level depth).
   */
  async addComment(userId: string, reelId: string, dto: CreateCommentDto) {
    const reel = await this.reelRepository.findOne({
      where: { id: reelId },
      relations: { user: true },
    });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    let targetParentId: string | null = null;
    if (dto.parentId) {
      const parent = await this.commentRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent comment not found.');
      }
      if (parent.reelId !== reelId) {
        throw new BadRequestException('Parent comment does not belong to this reel.');
      }
      // Enforce max 2-level depth:
      // If the parent is already a reply (has parentId), attach this reply to the root comment
      targetParentId = parent.parentId ? parent.parentId : parent.id;
    }

    const comment = this.commentRepository.create({
      reelId,
      userId,
      text: dto.text,
      parentId: targetParentId || undefined,
    });

    const saved = await this.commentRepository.save(comment);

    // 1. Check for @username mentions and notify mentioned users
    const mentionMatches = dto.text.match(/@([a-zA-Z0-9_]+)/g);
    if (mentionMatches && mentionMatches.length > 0) {
      const uniqueUsernames = [...new Set(mentionMatches.map((m) => m.substring(1).toLowerCase()))];
      for (const uname of uniqueUsernames) {
        const mentionedUser = await this.userRepository.findOne({
          where: { username: uname },
        });
        if (mentionedUser && mentionedUser.id !== userId) {
          await this.activityLogService.log({
            type: ActivityLogType.MENTION,
            actorId: userId,
            targetUserId: mentionedUser.id,
            reelId,
            message: `Someone mentioned you in a comment: "${dto.text.substring(0, 60)}${dto.text.length > 60 ? '...' : ''}"`,
            isGlobal: false,
            metadata: {
              reelId,
              reelTitle: reel.title,
              commentId: saved.id,
              commentText: dto.text,
            },
          });
        }
      }
    }

    // 2. Log comment activity to reel owner
    if (reel.userId !== userId) {
      await this.activityLogService.log({
        type: ActivityLogType.COMMENT,
        actorId: userId,
        targetUserId: reel.userId,
        reelId,
        message: `Someone commented on your reel "${reel.title}": "${dto.text.substring(0, 60)}${dto.text.length > 60 ? '...' : ''}"`,
        isGlobal: false,
        metadata: { reelId, reelTitle: reel.title, commentId: saved.id, commentText: dto.text },
      });
    }

    // 3. Fetch comment with user relation
    const loaded = await this.commentRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    return this.formatComment(loaded!, userId, 0, []);
  }

  /**
   * Gets paginated comments (or paginated replies of a parent comment) of a Reel.
   */
  async getComments(
    reelId: string,
    query?: CommentQueryDto,
    userId?: string | null,
  ) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    if (query?.parentId) {
      // Fetch paginated replies for a specific parent comment
      const [replies, total] = await this.commentRepository.findAndCount({
        where: { reelId, parentId: query.parentId },
        relations: { user: true },
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      const items = await Promise.all(
        replies.map(async (reply) => {
          const likesCount = await this.commentLikeRepository.count({
            where: { commentId: reply.id },
          });
          const isLiked = userId
            ? await this.commentLikeRepository
                .count({ where: { commentId: reply.id, userId } })
                .then((c) => c > 0)
            : false;
          return this.formatComment(reply, userId, 0, [], likesCount, isLiked);
        }),
      );

      return {
        items,
        total,
        page,
        limit,
        hasMore: skip + replies.length < total,
      };
    }

    // Fetch top-level root comments (parentId is null)
    const [comments, total] = await this.commentRepository.findAndCount({
      where: { reelId, parentId: IsNull() },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const items = await Promise.all(
      comments.map(async (comment) => {
        const repliesCount = await this.commentRepository.count({
          where: { parentId: comment.id },
        });
        const likesCount = await this.commentLikeRepository.count({
          where: { commentId: comment.id },
        });
        const isLiked = userId
          ? await this.commentLikeRepository
              .count({ where: { commentId: comment.id, userId } })
              .then((c) => c > 0)
          : false;

        // Fetch first 2 preview replies
        const previewRepliesRaw = await this.commentRepository.find({
          where: { parentId: comment.id },
          relations: { user: true },
          order: { createdAt: 'ASC' },
          take: 2,
        });

        const previewReplies = await Promise.all(
          previewRepliesRaw.map(async (r) => {
            const rLikesCount = await this.commentLikeRepository.count({
              where: { commentId: r.id },
            });
            const rIsLiked = userId
              ? await this.commentLikeRepository
                  .count({ where: { commentId: r.id, userId } })
                  .then((c) => c > 0)
              : false;
            return this.formatComment(r, userId, 0, [], rLikesCount, rIsLiked);
          }),
        );

        return this.formatComment(
          comment,
          userId,
          repliesCount,
          previewReplies,
          likesCount,
          isLiked,
        );
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + comments.length < total,
    };
  }

  /**
   * Likes a comment or reply.
   */
  async likeComment(userId: string, commentId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    const existing = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    if (!existing) {
      const like = this.commentLikeRepository.create({ commentId, userId });
      await this.commentLikeRepository.save(like);

      if (comment.userId !== userId) {
        await this.activityLogService.log({
          type: ActivityLogType.LIKE,
          actorId: userId,
          targetUserId: comment.userId,
          reelId: comment.reelId,
          message: `Someone liked your comment: "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
          isGlobal: false,
          metadata: {
            reelId: comment.reelId,
            commentId: comment.id,
            commentText: comment.text,
          },
        });
      }
    }

    const likesCount = await this.commentLikeRepository.count({
      where: { commentId },
    });
    return { success: true, isLiked: true, likesCount };
  }

  /**
   * Unlikes a comment or reply.
   */
  async unlikeComment(userId: string, commentId: string) {
    const existing = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });
    if (existing) {
      await this.commentLikeRepository.remove(existing);
    }

    const likesCount = await this.commentLikeRepository.count({
      where: { commentId },
    });
    return { success: true, isLiked: false, likesCount };
  }

  private formatComment(
    c: ReelComment,
    currentUserId?: string | null,
    repliesCount = 0,
    replies: any[] = [],
    likesCount = 0,
    isLiked = false,
  ): any {
    return {
      id: c.id,
      userId: c.userId,
      userName: c.user?.name || 'Vastu User',
      username: c.user?.username || null,
      userAvatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      commentText: c.text,
      timestamp: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      parentId: c.parentId || null,
      likesCount,
      isLiked,
      repliesCount,
      replies,
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
