import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Brackets } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { Reel, ReelStatus, ReelVisibility } from '../entities/reel.entity';
import { ReelMedia } from '../entities/reel-media.entity';
import { ReelUpload, UploadStatus } from '../entities/reel-upload.entity';
import { ReelLike } from '../entities/reel-like.entity';
import { Comment } from '../entities/comment.entity';
import { CommentLike } from '../entities/comment-like.entity';
import { ReelView } from '../entities/reel-view.entity';
import { ReelBookmark } from '../entities/reel-bookmark.entity';
import { ReelReport, ReelReportStatus } from '../entities/reel-report.entity';
import { User } from '../../users/entities/user.entity';
import { Follow } from '../../follows/entities/follow.entity';
import { FavoriteProfile } from '../../favorite-profiles/entities/favorite-profile.entity';
import { StorageService } from './storage.service';
import {
  CreateReelReportDto,
  GetReelReportsQueryDto,
  UpdateReportStatusDto,
} from '../dto/reel-report.dto';
import {
  InitUploadDto,
  CreateCommentDto,
  CommentQueryDto,
  FeedQueryDto,
  FeedSortBy,
  UpdateReelDto,
  GetAllCommentsQueryDto,
} from '../dto/reels.dto';
import { ActivityLogService } from '../../activity-logs/activity-log.service';
import { ActivityLogType } from '../../activity-logs/entities/activity-log.entity';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
];

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
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(ReelView)
    private readonly viewRepository: Repository<ReelView>,
    @InjectRepository(ReelBookmark)
    private readonly bookmarkRepository: Repository<ReelBookmark>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(FavoriteProfile)
    private readonly favoriteProfileRepository: Repository<FavoriteProfile>,
    @InjectRepository(ReelReport)
    private readonly reportRepository: Repository<ReelReport>,
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
      throw new BadRequestException(
        `Unsupported MIME type. Allowed formats: MP4, MOV, MKV, WebM.`,
      );
    }

    // 2. Create the Reel record (in UPLOADING status)
    const reel = this.reelRepository.create({
      userId,
      title: dto.title,
      caption: dto.caption || '',
      category: dto.category || 'general',
      subCategory: dto.subCategory || '',
      propertyType: dto.propertyType || '',
      minPrice: dto.minPrice != null ? dto.minPrice : null,
      maxPrice: dto.maxPrice != null ? dto.maxPrice : null,
      element: dto.element || '',
      location: dto.location || '',
      landmark: dto.landmark || '',
      city: dto.city || '',
      state: dto.state || '',
      pincode: dto.pincode || '',
      latitude: dto.latitude,
      longitude: dto.longitude,
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
    const uploadUrl = await this.storageService.getPresignedUploadUrl(
      storageKey,
      dto.mimeType,
      900,
      requestHost,
    );

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
    const upload = await this.uploadRepository.findOne({
      where: { id: uploadId },
    });
    if (!upload) {
      throw new NotFoundException('Upload session not found.');
    }
    if (upload.userId !== userId) {
      throw new ForbiddenException('You do not own this upload session.');
    }
    if (upload.status !== UploadStatus.UPLOADING) {
      throw new BadRequestException(
        `Upload is already in state: ${upload.status}`,
      );
    }

    // Verify object exists in storage
    const s3Meta = await this.storageService.getObjectMetadata(
      upload.storageKey,
    );
    if (!s3Meta.exists) {
      throw new BadRequestException(
        'File not found in storage. Ensure direct upload completed.',
      );
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
    const reel = await this.reelRepository.findOne({
      where: { id: uploadId },
      relations: { user: true },
    });
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

    // Log global activity: new reel published (commented out to prevent reel posting activity from appearing in Activity section)
    // await this.activityLogService.log({
    //   type: ActivityLogType.REEL_PUBLISHED,
    //   actorId: userId,
    //   reelId: reel.id,
    //   message: `${reel.user?.name ?? 'A creator'} published a new reel: "${reel.title}"`,
    //   isGlobal: true,
    //   metadata: { title: reel.title, actorName: reel.user?.name },
    // });

    return {
      reelId: reel.id,
      status: ReelStatus.PROCESSING,
    };
  }

  /**
   * Fetches paginated feed of READY reels, including creator data and user states.
   */
  async getFeed(
    userId: string | null,
    query: FeedQueryDto,
    requestHost?: string,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.reelRepository
      .createQueryBuilder('reel')
      .leftJoinAndSelect('reel.user', 'creator')
      .leftJoinAndSelect('reel.media', 'media')
      .where('reel.status = :status', { status: ReelStatus.READY })
      .andWhere('reel.visibility = :visibility', {
        visibility: ReelVisibility.PUBLIC,
      });

    if (query.category && query.category.toLowerCase() !== 'all') {
      qb.andWhere('LOWER(reel.category) = LOWER(:category)', {
        category: query.category,
      });
    }
    if (query.subCategory && query.subCategory.toLowerCase() !== 'all') {
      qb.andWhere('LOWER(reel.subCategory) = LOWER(:subCategory)', {
        subCategory: query.subCategory,
      });
    }
    if (query.propertyType && query.propertyType.toLowerCase() !== 'all') {
      qb.andWhere('LOWER(reel.propertyType) = LOWER(:propertyType)', {
        propertyType: query.propertyType,
      });
    }
    if (query.element && query.element.toLowerCase() !== 'all') {
      qb.andWhere('LOWER(reel.element) = LOWER(:element)', {
        element: query.element,
      });
    }
    if (query.minPrice != null && query.minPrice > 0) {
      qb.andWhere(
        '(reel.maxPrice >= :minPrice OR (reel.maxPrice IS NULL AND reel.minPrice >= :minPrice))',
        { minPrice: query.minPrice },
      );
    }
    if (query.maxPrice != null && query.maxPrice < 50000000) {
      qb.andWhere(
        '(reel.minPrice <= :maxPrice OR (reel.minPrice IS NULL AND reel.maxPrice <= :maxPrice))',
        { maxPrice: query.maxPrice },
      );
    }
    if (query.minRating != null && query.minRating > 0) {
      qb.andWhere('creator.rating >= :minRating', {
        minRating: query.minRating,
      });
    }
    if (query.userId) {
      qb.andWhere('reel.userId = :userId', { userId: query.userId });
    } else if (userId) {
      // Exclude posts from creators who blocked the requesting user or are blocked by the requesting user
      qb.andWhere(
        `reel.user_id NOT IN (
          SELECT ub.blocked_id FROM user_blocks ub WHERE ub.blocker_id = :currentBlockerId AND ub.blocked_id IS NOT NULL
          UNION
          SELECT ub.blocker_id FROM user_blocks ub WHERE ub.blocked_id = :currentBlockerId AND ub.blocker_id IS NOT NULL
        )`,
        { currentBlockerId: userId },
      );
    }
    if (query.liked && userId) {
      qb.innerJoin('reel.likes', 'userLike', 'userLike.userId = :likeUserId', {
        likeUserId: userId,
      });
    }
    if (query.saved && userId) {
      qb.innerJoin(
        'reel.bookmarks',
        'userBookmark',
        'userBookmark.userId = :bookmarkUserId',
        { bookmarkUserId: userId },
      );
    }
    if (query.history && userId) {
      qb.innerJoin(
        'reel.views',
        'userView',
        'userView.userId = :historyUserId',
        { historyUserId: userId },
      );
    }
    if (query.commented && userId) {
      qb.innerJoin(
        'reel.comments',
        'userComment',
        'userComment.userId = :commentUserId',
        { commentUserId: userId },
      );
    }
    if (query.search && query.search.trim()) {
      const searchTerms = query.search.trim().split(/\s+/).filter(Boolean);
      qb.andWhere(
        new Brackets((subQb) => {
          searchTerms.forEach((term, idx) => {
            const paramName = `search_${idx}`;
            subQb.andWhere(
              `(LOWER(reel.title) LIKE LOWER(:${paramName}) OR LOWER(reel.caption) LIKE LOWER(:${paramName}) OR LOWER(reel.location) LIKE LOWER(:${paramName}) OR LOWER(reel.category) LIKE LOWER(:${paramName}) OR LOWER(reel.subCategory) LIKE LOWER(:${paramName}) OR LOWER(reel.propertyType) LIKE LOWER(:${paramName}) OR LOWER(reel.element) LIKE LOWER(:${paramName}) OR LOWER(creator.name) LIKE LOWER(:${paramName}) OR LOWER(creator.username) LIKE LOWER(:${paramName}))`,
              { [paramName]: `%${term}%` },
            );
          });
        }),
      );
    }

    if (query.history && userId) {
      qb.orderBy('userView.createdAt', 'DESC');
    } else if (query.commented && userId) {
      qb.orderBy('userComment.createdAt', 'DESC');
    } else if (query.sortBy === FeedSortBy.VIEWS) {
      qb.orderBy('reel.viewsCount', 'DESC').addOrderBy(
        'reel.createdAt',
        'DESC',
      );
    } else if (query.sortBy === FeedSortBy.PRICE_LOW_HIGH) {
      qb.orderBy(
        'COALESCE(reel.minPrice, reel.maxPrice)',
        'ASC',
        'NULLS LAST',
      ).addOrderBy('reel.createdAt', 'DESC');
    } else if (query.sortBy === FeedSortBy.PRICE_HIGH_LOW) {
      qb.orderBy(
        'COALESCE(reel.maxPrice, reel.minPrice)',
        'DESC',
        'NULLS LAST',
      ).addOrderBy('reel.createdAt', 'DESC');
    } else if (query.sortBy === FeedSortBy.LIKES) {
      qb.orderBy('reel.createdAt', 'DESC');
    } else {
      qb.orderBy('reel.createdAt', 'DESC');
    }
    qb.skip(skip).take(limit);

    const [reels, total] = await qb.getManyAndCount();

    // Map feeds with stats and user-specific flags
    const items = await Promise.all(
      reels.map(async (reel) => {
        const likesCount = await this.likeRepository.count({
          where: { reelId: reel.id },
        });
        const commentsCount = await this.commentRepository.count({
          where: { reelId: reel.id },
        });
        const bookmarksCount = await this.bookmarkRepository.count({
          where: { reelId: reel.id },
        });

        let isLiked = false;
        let isBookmarked = false;
        let isFollowingCreator = false;
        let isFavoriteCreator = false;

        if (userId) {
          isLiked = await this.likeRepository
            .count({ where: { reelId: reel.id, userId } })
            .then((c) => c > 0);
          isBookmarked = await this.bookmarkRepository
            .count({ where: { reelId: reel.id, userId } })
            .then((c) => c > 0);
          if (reel.userId) {
            isFollowingCreator = await this.followRepository
              .count({
                where: { followerId: userId, followingId: reel.userId },
              })
              .then((c) => c > 0);
            isFavoriteCreator = await this.favoriteProfileRepository
              .count({ where: { userId, favoriteProfileId: reel.userId } })
              .then((c) => c > 0);
          }
        }

        // Formulate streaming paths
        const videoUrl = reel.media?.hlsKey
          ? this.storageService.getObjectUrl(reel.media.hlsKey, requestHost)
          : null;
        const thumbnailUrl = reel.media?.thumbnailKey
          ? this.storageService.getObjectUrl(
              reel.media.thumbnailKey,
              requestHost,
            )
          : null;

        let creatorAvatarUrl = reel.user?.avatarUrl || '';
        if (
          creatorAvatarUrl &&
          !creatorAvatarUrl.startsWith('http') &&
          !creatorAvatarUrl.startsWith('data:')
        ) {
          creatorAvatarUrl = this.storageService.getObjectUrl(
            creatorAvatarUrl,
            requestHost,
          );
        }

        return {
          id: reel.id,
          title: reel.title,
          caption: reel.caption,
          category: reel.category,
          subCategory: reel.subCategory,
          propertyType: reel.propertyType,
          element: reel.element,
          location: reel.location,
          landmark: reel.landmark,
          city: reel.city,
          state: reel.state,
          pincode: reel.pincode,
          minPrice: reel.minPrice != null ? Number(reel.minPrice) : null,
          maxPrice: reel.maxPrice != null ? Number(reel.maxPrice) : null,
          price:
            reel.minPrice != null
              ? Number(reel.minPrice)
              : reel.maxPrice != null
                ? Number(reel.maxPrice)
                : null,
          latitude: reel.latitude != null ? Number(reel.latitude) : null,
          longitude: reel.longitude != null ? Number(reel.longitude) : null,
          createdAt: reel.createdAt,
          likesCount,
          commentsCount,
          bookmarksCount,
          viewsCount: String(reel.viewsCount),
          videoUrl,
          thumbnailUrl,
          isLiked,
          isBookmarked,
          mediaUrls: thumbnailUrl ? [thumbnailUrl] : [],
          creator: {
            id: reel.user?.id || reel.userId || 'c_unknown',
            name: reel.user?.name || reel.user?.username || 'Vastu Creator',
            username: reel.user?.username || '',
            avatarUrl: creatorAvatarUrl,
            coverImageUrl: reel.user?.coverImageUrl || '',
            profession: reel.user?.profession || '',
            bio: reel.user?.bio || '',
            location: reel.user?.address || reel.location || '',
            highlights: reel.user?.highlights || '',
            whatsapp: reel.user?.whatsapp || '',
            website: reel.user?.website || '',
            rating: reel.user?.rating ? Number(reel.user.rating) : 4.8,
            ratingsCount: reel.user?.ratingsCount || 0,
            isVerified: reel.user?.isVerified ?? false,
            title: reel.user?.profession || 'Certified Consultant',
            isFollowing: isFollowingCreator,
            isFavorite: isFavoriteCreator,
          },
        };
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
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

    const likesCount = await this.likeRepository.count({
      where: { reelId: reel.id },
    });
    const commentsCount = await this.commentRepository.count({
      where: { reelId: reel.id },
    });
    const bookmarksCount = await this.bookmarkRepository.count({
      where: { reelId: reel.id },
    });

    let isLiked = false;
    let isBookmarked = false;
    let isFollowingCreator = false;

    if (userId) {
      isLiked = await this.likeRepository
        .count({ where: { reelId: reel.id, userId } })
        .then((c) => c > 0);
      isBookmarked = await this.bookmarkRepository
        .count({ where: { reelId: reel.id, userId } })
        .then((c) => c > 0);
      if (reel.userId) {
        isFollowingCreator = await this.followRepository
          .count({ where: { followerId: userId, followingId: reel.userId } })
          .then((c) => c > 0);
      }
    }

    const videoUrl = reel.media?.hlsKey
      ? this.storageService.getObjectUrl(reel.media.hlsKey, requestHost)
      : null;
    const thumbnailUrl = reel.media?.thumbnailKey
      ? this.storageService.getObjectUrl(reel.media.thumbnailKey, requestHost)
      : null;

    let creatorAvatarUrl = reel.user?.avatarUrl || '';
    if (
      creatorAvatarUrl &&
      !creatorAvatarUrl.startsWith('http') &&
      !creatorAvatarUrl.startsWith('data:')
    ) {
      creatorAvatarUrl = this.storageService.getObjectUrl(
        creatorAvatarUrl,
        requestHost,
      );
    }

    return {
      id: reel.id,
      title: reel.title,
      caption: reel.caption,
      category: reel.category,
      subCategory: reel.subCategory,
      propertyType: reel.propertyType,
      element: reel.element,
      location: reel.location,
      landmark: reel.landmark,
      city: reel.city,
      state: reel.state,
      pincode: reel.pincode,
      latitude: reel.latitude != null ? Number(reel.latitude) : null,
      longitude: reel.longitude != null ? Number(reel.longitude) : null,
      createdAt: reel.createdAt,
      likesCount,
      commentsCount,
      bookmarksCount,
      viewsCount: String(reel.viewsCount),
      videoUrl,
      thumbnailUrl,
      isLiked,
      isBookmarked,
      mediaUrls: thumbnailUrl ? [thumbnailUrl] : [],
      creator: {
        id: reel.user?.id || reel.userId || 'c_unknown',
        name: reel.user?.name || reel.user?.username || 'Vastu Creator',
        username: reel.user?.username || '',
        avatarUrl: creatorAvatarUrl,
        coverImageUrl: reel.user?.coverImageUrl || '',
        profession: reel.user?.profession || '',
        bio: reel.user?.bio || '',
        location: reel.user?.address || reel.location || '',
        highlights: reel.user?.highlights || '',
        whatsapp: reel.user?.whatsapp || '',
        website: reel.user?.website || '',
        rating: reel.user?.rating ? Number(reel.user.rating) : 4.8,
        ratingsCount: reel.user?.ratingsCount || 0,
        isVerified: reel.user?.isVerified ?? false,
        title: reel.user?.profession || 'Certified Consultant',
        isFollowing: isFollowingCreator,
      },
    };
  }

  /**
   * Deletes a Reel by ID (soft delete + triggers folder deletion in S3).
   * Allows owner or SUPER_ADMIN / ADMIN to delete.
   */
  async deleteReel(userId: string, id: string, userRoles?: string[]) {
    const reel = await this.reelRepository.findOne({ where: { id } });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    const isAdmin =
      userRoles?.includes('SUPER_ADMIN') ||
      userRoles?.includes('ADMIN') ||
      false;

    if (reel.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this reel.',
      );
    }

    reel.status = ReelStatus.DELETED;
    await this.reelRepository.save(reel);

    // Asynchronously delete assets in storage
    const s3Prefix = `reels/${id}`;
    this.storageService.deleteFolder(s3Prefix).catch((err) => {
      console.error(`Failed to delete S3 folder for Reel ${id}:`, err);
    });

    return { success: true, message: 'Reel deleted successfully.' };
  }

  /**
   * Deletes a comment or reply (owner or admin).
   */
  async deleteComment(userId: string, commentId: string, userRoles?: string[]) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    const isAdmin =
      userRoles?.includes('SUPER_ADMIN') ||
      userRoles?.includes('ADMIN') ||
      false;

    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment.',
      );
    }

    // Delete comment likes
    await this.commentLikeRepository.delete({ commentId });

    // If root comment, delete replies
    if (!comment.parentId) {
      const replies = await this.commentRepository.find({
        where: { parentId: comment.id },
      });
      for (const reply of replies) {
        await this.commentLikeRepository.delete({ commentId: reply.id });
      }
      await this.commentRepository.delete({ parentId: comment.id });
    }

    await this.commentRepository.remove(comment);

    return { success: true, message: 'Comment deleted successfully.' };
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

    const existing = await this.likeRepository.findOne({
      where: { reelId, userId },
    });
    if (!existing) {
      const like = this.likeRepository.create({ reelId, userId });
      await this.likeRepository.save(like);

      // Log like activity (personal — only reel owner sees it)
      if (reel.userId !== userId) {
        const actor = await this.userRepository.findOne({
          where: { id: userId },
        });
        const actorDisplayName = actor?.username
          ? `@${actor.username}`
          : actor?.name || 'Someone';

        await this.activityLogService.log({
          type: ActivityLogType.LIKE,
          actorId: userId,
          targetUserId: reel.userId,
          reelId,
          message: `${actorDisplayName} liked your reel "${reel.title}".`,
          isGlobal: false,
          metadata: {
            reelId,
            reelTitle: reel.title,
            actorName: actorDisplayName,
          },
        });
      }
    }
    return { success: true };
  }

  /**
   * Unlikes a Reel.
   */
  async unlikeReel(userId: string, reelId: string) {
    const existing = await this.likeRepository.findOne({
      where: { reelId, userId },
    });
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

    const existing = await this.bookmarkRepository.findOne({
      where: { reelId, userId },
    });
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
    const existing = await this.bookmarkRepository.findOne({
      where: { reelId, userId },
    });
    if (existing) {
      await this.bookmarkRepository.remove(existing);
    }
    return { success: true };
  }

  /**
   * Adds a Comment or Reply to a Reel (strictly enforces max 2-level depth).
   */
  async addComment(
    userId: string,
    reelId: string,
    dto: CreateCommentDto,
    requestHost?: string,
  ) {
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
        throw new BadRequestException(
          'Parent comment does not belong to this reel.',
        );
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

    const actor = await this.userRepository.findOne({ where: { id: userId } });
    const actorDisplayName = actor?.username
      ? `@${actor.username}`
      : actor?.name || 'Someone';

    // 1. Check for @username mentions and notify mentioned users
    const mentionMatches = dto.text.match(/@([a-zA-Z0-9_]+)/g);
    if (mentionMatches && mentionMatches.length > 0) {
      const uniqueUsernames = [
        ...new Set(mentionMatches.map((m) => m.substring(1).toLowerCase())),
      ];
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
            message: `${actorDisplayName} mentioned you in a comment: "${dto.text.substring(0, 60)}${dto.text.length > 60 ? '...' : ''}"`,
            isGlobal: false,
            metadata: {
              reelId,
              reelTitle: reel.title,
              commentId: saved.id,
              commentText: dto.text,
              actorName: actorDisplayName,
            },
          });
        }
      }
    }

    // 2. If this is a reply to a parent comment, notify the parent comment author
    if (dto.parentId) {
      const parent = await this.commentRepository.findOne({
        where: { id: dto.parentId },
      });
      if (
        parent &&
        parent.userId &&
        parent.userId !== userId &&
        parent.userId !== reel.userId
      ) {
        await this.activityLogService.log({
          type: ActivityLogType.COMMENT,
          actorId: userId,
          targetUserId: parent.userId,
          reelId,
          message: `${actorDisplayName} replied to your comment: "${dto.text.substring(0, 60)}${dto.text.length > 60 ? '...' : ''}"`,
          isGlobal: false,
          metadata: {
            reelId,
            reelTitle: reel.title,
            commentId: saved.id,
            commentText: dto.text,
            actorName: actorDisplayName,
          },
        });
      }
    }

    // 3. Log comment activity to reel owner
    if (reel.userId !== userId) {
      await this.activityLogService.log({
        type: ActivityLogType.COMMENT,
        actorId: userId,
        targetUserId: reel.userId,
        reelId,
        message: `${actorDisplayName} commented on your reel "${reel.title}": "${dto.text.substring(0, 60)}${dto.text.length > 60 ? '...' : ''}"`,
        isGlobal: false,
        metadata: {
          reelId,
          reelTitle: reel.title,
          commentId: saved.id,
          commentText: dto.text,
          actorName: actorDisplayName,
        },
      });
    }    // 4. Fetch comment with user relation
    const loaded = await this.commentRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    return this.formatComment(
      loaded!,
      userId,
      0,
      [],
      0,
      false,
      requestHost,
      reel.userId,
    );
  }

  /**
   * Gets paginated comments (or paginated replies of a parent comment) of a Reel.
   */
  async getComments(
    reelId: string,
    query?: CommentQueryDto,
    userId?: string | null,
    requestHost?: string,
    userRoles: string[] = [],
  ) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(50, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    // Fetch reel owner to check if current user is the reel creator
    const reel = await this.reelRepository.findOne({
      where: { id: reelId },
      select: { id: true, userId: true },
    });
    const reelOwnerId = reel?.userId || null;
    const isAdmin =
      userRoles?.includes('SUPER_ADMIN') ||
      userRoles?.includes('ADMIN') ||
      false;

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
          return this.formatComment(
            reply,
            userId,
            0,
            [],
            likesCount,
            isLiked,
            requestHost,
            reelOwnerId,
            isAdmin,
          );
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
      order: { isPinned: 'DESC', createdAt: 'DESC' },
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
            return this.formatComment(
              r,
              userId,
              0,
              [],
              rLikesCount,
              rIsLiked,
              requestHost,
              reelOwnerId,
              isAdmin,
            );
          }),
        );

        return this.formatComment(
          comment,
          userId,
          repliesCount,
          previewReplies,
          likesCount,
          isLiked,
          requestHost,
          reelOwnerId,
          isAdmin,
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
   * Admin endpoint: Gets paginated comments across all platform reels with filtering & search.
   */
  async getAllComments(query?: GetAllCommentsQueryDto, requestHost?: string) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.reel', 'reel')
      .orderBy('comment.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query?.reelId) {
      qb.andWhere('comment.reelId = :reelId', { reelId: query.reelId });
    }

    if (query?.category && query.category !== 'ALL') {
      qb.andWhere('reel.category ILIKE :category', {
        category: `%${query.category}%`,
      });
    }

    if (query?.search) {
      const searchTerm = `%${query.search}%`;
      qb.andWhere(
        new Brackets((qbSub) => {
          qbSub
            .where('comment.text ILIKE :search', { search: searchTerm })
            .orWhere('user.name ILIKE :search', { search: searchTerm })
            .orWhere('user.username ILIKE :search', { search: searchTerm })
            .orWhere('reel.title ILIKE :search', { search: searchTerm });
        }),
      );
    }

    const [comments, total] = await qb.getManyAndCount();

    const items = comments.map((c) => {
      let avatarUrl = c.user?.avatarUrl || '';
      if (
        avatarUrl &&
        !avatarUrl.startsWith('http') &&
        !avatarUrl.startsWith('data:')
      ) {
        avatarUrl = this.storageService.getObjectUrl(avatarUrl, requestHost);
      }
      return {
        id: c.id,
        userId: c.userId,
        userName: c.user?.name || 'Vastu User',
        userHandle:
          c.user?.username ||
          c.user?.name?.toLowerCase().replace(/\s+/g, '') ||
          'user',
        userIsVerified: c.user?.isVerified || false,
        userAvatarUrl: avatarUrl || null,
        avatarUrl: avatarUrl || null,
        userAvatar: avatarUrl || null,
        text: c.text,
        isPinned: c.isPinned || false,
        pinnedAt: c.pinnedAt ? c.pinnedAt.toISOString() : null,
        reelId: c.reelId,
        reelTitle: c.reel?.title || 'Vastu Reel',
        reelCategory: c.reel?.category || 'General',
        createdAt: c.createdAt
          ? c.createdAt.toISOString()
          : new Date().toISOString(),
      };
    });

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
        const actor = await this.userRepository.findOne({
          where: { id: userId },
        });
        const actorDisplayName = actor?.username
          ? `@${actor.username}`
          : actor?.name || 'Someone';

        await this.activityLogService.log({
          type: ActivityLogType.LIKE,
          actorId: userId,
          targetUserId: comment.userId,
          reelId: comment.reelId,
          message: `${actorDisplayName} liked your comment: "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
          isGlobal: false,
          metadata: {
            reelId: comment.reelId,
            commentId: comment.id,
            commentText: comment.text,
            actorName: actorDisplayName,
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

  /**
   * Pins or unpins a top-level comment on a Reel (creator of the reel or admin only).
   */
  async pinComment(userId: string, commentId: string, userRoles?: string[]) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { user: true, reel: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    if (comment.parentId) {
      throw new BadRequestException('Only top-level comments can be pinned.');
    }

    const reel =
      comment.reel ||
      (await this.reelRepository.findOne({ where: { id: comment.reelId } }));
    if (!reel) {
      throw new NotFoundException('Associated reel not found.');
    }

    const isAdmin =
      userRoles?.includes('SUPER_ADMIN') ||
      userRoles?.includes('ADMIN') ||
      false;
    const isReelOwner = reel.userId === userId;

    if (!isReelOwner && !isAdmin) {
      throw new ForbiddenException(
        'Only the video creator or an admin can pin comments on this reel.',
      );
    }

    if (comment.isPinned) {
      // Toggle off pin
      comment.isPinned = false;
      comment.pinnedAt = null;
      await this.commentRepository.save(comment);
      return {
        success: true,
        isPinned: false,
        message: 'Comment unpinned successfully.',
      };
    }

    // Unpin any previously pinned comment on this reel
    await this.commentRepository.update(
      { reelId: comment.reelId, isPinned: true },
      { isPinned: false, pinnedAt: null },
    );

    // Pin target comment
    comment.isPinned = true;
    comment.pinnedAt = new Date();
    await this.commentRepository.save(comment);

    // Send activity log notification to comment author if not the one pinning
    if (comment.userId !== userId) {
      const actor = await this.userRepository.findOne({
        where: { id: userId },
      });
      const actorDisplayName = actor?.username
        ? `@${actor.username}`
        : actor?.name || 'The creator';

      await this.activityLogService.log({
        type: ActivityLogType.COMMENT,
        actorId: userId,
        targetUserId: comment.userId,
        reelId: comment.reelId,
        message: `${actorDisplayName} pinned your comment on "${reel.title}": "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
        isGlobal: false,
        metadata: {
          reelId: comment.reelId,
          reelTitle: reel.title,
          commentId: comment.id,
          commentText: comment.text,
          actorName: actorDisplayName,
          action: 'PIN',
        },
      });
    }

    return {
      success: true,
      isPinned: true,
      message: 'Comment pinned successfully.',
    };
  }

  /**
   * Unpins a comment on a Reel (creator of the reel or admin only).
   */
  async unpinComment(userId: string, commentId: string, userRoles?: string[]) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: { reel: true },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    const reel =
      comment.reel ||
      (await this.reelRepository.findOne({ where: { id: comment.reelId } }));
    if (!reel) {
      throw new NotFoundException('Associated reel not found.');
    }

    const isAdmin =
      userRoles?.includes('SUPER_ADMIN') ||
      userRoles?.includes('ADMIN') ||
      false;
    const isReelOwner = reel.userId === userId;

    if (!isReelOwner && !isAdmin) {
      throw new ForbiddenException(
        'Only the video creator or an admin can unpin comments on this reel.',
      );
    }

    if (comment.isPinned) {
      comment.isPinned = false;
      comment.pinnedAt = null;
      await this.commentRepository.save(comment);
    }

    return {
      success: true,
      isPinned: false,
      message: 'Comment unpinned successfully.',
    };
  }

  /**
   * Masks contact numbers (between 9 to 13 digits) with '#' for unauthorized viewers.
   * Only Reel Creator, Admins, and Comment Author are authorized to see the number.
   * e.g. "this is my contact number 3121234234" -> "this is my contact number ##########"
   */
  maskContactNumbers(text: string): string {
    if (!text) return text;
    return text.replace(
      /(?<!\w)(?:\+?\d[\d\s-]{7,18}\d|\+?\d{9,13})(?!\w)/g,
      (match) => {
        const digits = match.replace(/\D/g, '');
        if (digits.length >= 9 && digits.length <= 13) {
          return '#'.repeat(match.length);
        }
        return match;
      },
    );
  }

  private formatComment(
    c: Comment,
    currentUserId?: string | null,
    repliesCount = 0,
    replies: any[] = [],
    likesCount = 0,
    isLiked = false,
    requestHost?: string,
    reelOwnerId?: string | null,
    isAdmin = false,
  ): any {
    let userAvatarUrl = c.user?.avatarUrl || '';
    if (
      userAvatarUrl &&
      !userAvatarUrl.startsWith('http') &&
      !userAvatarUrl.startsWith('data:')
    ) {
      userAvatarUrl = this.storageService.getObjectUrl(
        userAvatarUrl,
        requestHost,
      );
    }

    const isCreator = Boolean(
      currentUserId && reelOwnerId && currentUserId === reelOwnerId,
    );
    const isCommentor = Boolean(
      currentUserId && c.userId && currentUserId === c.userId,
    );
    const canSeeContactNumber = isAdmin || isCreator || isCommentor;
    const commentText = canSeeContactNumber
      ? c.text
      : this.maskContactNumbers(c.text);

    return {
      id: c.id,
      userId: c.userId,
      userName: c.user?.name || 'Vastu User',
      username: c.user?.username || null,
      userAvatarUrl: userAvatarUrl || null,
      avatarUrl: userAvatarUrl || null,
      userAvatar: userAvatarUrl || null,
      commentText,
      text: commentText,
      timestamp: c.createdAt
        ? c.createdAt.toISOString()
        : new Date().toISOString(),
      parentId: c.parentId || null,
      isPinned: c.isPinned || false,
      pinnedAt: c.pinnedAt ? c.pinnedAt.toISOString() : null,
      isVerified: c.user?.isVerified || false,
      userIsVerified: c.user?.isVerified || false,
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

  /**
   * Returns dynamic trending tags and trending videos based on real data only.
   * Criteria: Aggregated from active READY & PUBLIC reels, ordered by total views and video count.
   */
  async getTrending(requestHost?: string) {
    const reels = await this.reelRepository.find({
      where: { status: ReelStatus.READY, visibility: ReelVisibility.PUBLIC },
      relations: { media: true, user: true },
      order: { viewsCount: 'DESC', createdAt: 'DESC' },
      take: 100,
    });

    if (reels.length === 0) {
      return [];
    }

    const tagMap = new Map<
      string,
      { tag: string; count: number; views: number; thumbnail: string | null }
    >();

    for (const reel of reels) {
      const thumbnail = reel.media?.thumbnailKey
        ? this.storageService.getObjectUrl(reel.media.thumbnailKey, requestHost)
        : null;

      const text = `${reel.title || ''} ${reel.caption || ''}`;
      // Extract only explicit hashtags (e.g., #VastuTips, #NorthFacing) with at least 3 characters
      const matches = text.match(/#[a-zA-Z0-9_]{3,}/g) || [];
      const candidateTags = new Set<string>(matches.map((t) => t.trim()));

      for (const tag of candidateTags) {
        const normalized = tag;
        const existing = tagMap.get(normalized) || {
          tag: normalized,
          count: 0,
          views: 0,
          thumbnail: thumbnail || null,
        };
        existing.count += 1;
        existing.views += reel.viewsCount || 0;
        if (!existing.thumbnail && thumbnail) {
          existing.thumbnail = thumbnail;
        }
        tagMap.set(normalized, existing);
      }
    }

    const dynamicTrendingTags = Array.from(tagMap.values())
      .sort((a, b) => b.views - a.views || b.count - a.count)
      .slice(0, 15)
      .map((item) => {
        let countDisplay = `${item.count} video${item.count > 1 ? 's' : ''}`;
        if (item.views >= 1000000) {
          countDisplay = `${(item.views / 1000000).toFixed(1)}M views`;
        } else if (item.views >= 1000) {
          countDisplay = `${(item.views / 1000).toFixed(1)}K views`;
        }
        return {
          tag: item.tag,
          count: countDisplay,
          image: item.thumbnail || '',
        };
      });

    return dynamicTrendingTags;
  }

  /**
   * Returns list of popular creators based on real activity only.
   * Criteria: Registered active users who have published at least 1 ready reel OR have at least 1 follower,
   * ranked by follower count and published reels count.
   */
  async getPopularCreators(
    currentUserId?: string | null,
    requestHost?: string,
  ) {
    const users = await this.userRepository.find({
      where: { isActive: true },
      take: 50,
    });

    const creatorList = await Promise.all(
      users.map(async (user) => {
        const followersCount = await this.followRepository.count({
          where: { followingId: user.id },
        });
        const reelsCount = await this.reelRepository.count({
          where: { userId: user.id, status: ReelStatus.READY },
        });

        // Strict criteria: Must have at least 1 published reel or 1 follower to be considered a creator
        if (reelsCount === 0 && followersCount === 0) {
          return null;
        }

        let isFollowing = false;
        if (currentUserId && currentUserId !== user.id) {
          isFollowing = await this.followRepository
            .count({
              where: { followerId: currentUserId, followingId: user.id },
            })
            .then((c) => c > 0);
        }

        let avatarUrl = user.avatarUrl || '';
        if (
          avatarUrl &&
          !avatarUrl.startsWith('http') &&
          !avatarUrl.startsWith('data:')
        ) {
          avatarUrl = this.storageService.getObjectUrl(avatarUrl, requestHost);
        }

        return {
          id: user.id,
          name: user.name || user.username || 'Creator',
          username: user.username || null,
          avatarUrl,
          isVerified: user.isVerified || false,
          title:
            reelsCount > 0
              ? `${reelsCount} Reel${reelsCount > 1 ? 's' : ''}`
              : 'Creator',
          followersCount,
          reelsCount,
          isFollowing,
        };
      }),
    );

    const validCreators = creatorList.filter(
      (c): c is NonNullable<typeof c> => c !== null,
    );

    // Sort by popularity score: followers * 3 + reelsCount * 2
    validCreators.sort((a, b) => {
      const scoreA = a.followersCount * 3 + a.reelsCount * 2;
      const scoreB = b.followersCount * 3 + b.reelsCount * 2;
      return scoreB - scoreA;
    });

    return validCreators;
  }

  /**
   * Updates metadata for an existing reel (title, caption, thumbnail, etc.).
   * The original video media file cannot be replaced.
   */
  async updateReel(
    userId: string,
    id: string,
    dto: UpdateReelDto,
    requestHost?: string,
  ) {
    const reel = await this.reelRepository.findOne({
      where: { id },
      relations: { media: true, user: true },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    if (reel.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to edit this reel.',
      );
    }

    if (dto.title !== undefined) reel.title = dto.title;
    if (dto.caption !== undefined) reel.caption = dto.caption;
    if (dto.category !== undefined) reel.category = dto.category;
    if (dto.subCategory !== undefined) reel.subCategory = dto.subCategory;
    if (dto.propertyType !== undefined) reel.propertyType = dto.propertyType;
    if (dto.minPrice !== undefined) reel.minPrice = dto.minPrice;
    if (dto.maxPrice !== undefined) reel.maxPrice = dto.maxPrice;
    if (dto.element !== undefined) reel.element = dto.element;
    if (dto.location !== undefined) reel.location = dto.location;
    if (dto.landmark !== undefined) reel.landmark = dto.landmark;
    if (dto.city !== undefined) reel.city = dto.city;
    if (dto.state !== undefined) reel.state = dto.state;
    if (dto.pincode !== undefined) reel.pincode = dto.pincode;

    if (dto.thumbnailUrl !== undefined) {
      if (reel.media) {
        reel.media.thumbnailKey = dto.thumbnailUrl;
        await this.mediaRepository.save(reel.media);
      }
    }

    await this.reelRepository.save(reel);
    return this.getById(id, userId, requestHost);
  }

  /**
   * User submits a report on a reel.
   */
  async reportReel(userId: string, reelId: string, dto: CreateReelReportDto) {
    const reel = await this.reelRepository.findOne({
      where: { id: reelId },
      relations: { user: true },
    });
    if (!reel) {
      throw new NotFoundException('Reel not found.');
    }

    // Check if user already reported this reel with PENDING status
    const existing = await this.reportRepository.findOne({
      where: {
        reelId,
        reporterId: userId,
        status: ReelReportStatus.PENDING,
      },
    });

    if (existing) {
      return {
        success: true,
        message: 'You have already submitted a report for this reel. It is under review.',
        reportId: existing.id,
      };
    }

    const report = this.reportRepository.create({
      reelId,
      reporterId: userId,
      reason: dto.reason,
      details: dto.details?.trim() || null,
      status: ReelReportStatus.PENDING,
    });

    await this.reportRepository.save(report);

    return {
      success: true,
      message: 'Report submitted successfully. Thank you for keeping the platform safe.',
      reportId: report.id,
    };
  }

  /**
   * Get reports submitted by current user (for mobile My Reports screen).
   */
  async getMyReports(userId: string, requestHost?: string) {
    const reports = await this.reportRepository.find({
      where: { reporterId: userId },
      relations: { reel: { media: true, user: true } },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return reports.map((r) => {
      const thumbUrl = r.reel?.media?.thumbnailKey
        ? this.storageService.getObjectUrl(r.reel.media.thumbnailKey, requestHost)
        : '';

      let mappedStatus = 'submitted';
      if (r.status === ReelReportStatus.RESOLVED) {
        mappedStatus = 'resolved';
      } else if (r.status === ReelReportStatus.DISMISSED) {
        mappedStatus = 'dismissed';
      } else if (r.status === ReelReportStatus.REVIEWED) {
        mappedStatus = 'under_review';
      } else {
        mappedStatus = 'submitted';
      }

      return {
        id: r.id,
        postId: r.reelId,
        postTitle: r.reel?.title || 'Reported Video',
        postImageUrl: thumbUrl,
        creatorName: r.reel?.user?.name || 'Creator',
        location: r.reel?.location || '',
        projectType: r.reel?.category || 'Reel',
        mainReason: r.reason,
        subReason: '',
        details: r.details || '',
        evidenceFilesCount: 0,
        isGenuineDeclarationConfirmed: true,
        status: mappedStatus,
        rawStatus: r.status,
        adminNotes: r.adminNotes || '',
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  /**
   * Admin: Get all reports with filtering, pagination, and status breakdown.
   */
  async getAdminReports(query: GetReelReportsQueryDto, requestHost?: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reel', 'reel')
      .leftJoinAndSelect('reel.media', 'media')
      .leftJoinAndSelect('reel.user', 'creator')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reviewedBy', 'reviewedBy')
      .orderBy('report.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('report.status = :status', { status: query.status });
    }

    if (query.search?.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('reel.title LIKE :s', { s })
            .orWhere('report.reason LIKE :s', { s })
            .orWhere('report.details LIKE :s', { s })
            .orWhere('reporter.name LIKE :s', { s })
            .orWhere('reporter.email LIKE :s', { s })
            .orWhere('creator.name LIKE :s', { s });
        }),
      );
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Summary counts for filter tabs
    const [pendingCount, resolvedCount, dismissedCount, totalCount] =
      await Promise.all([
        this.reportRepository.count({
          where: { status: ReelReportStatus.PENDING },
        }),
        this.reportRepository.count({
          where: { status: ReelReportStatus.RESOLVED },
        }),
        this.reportRepository.count({
          where: { status: ReelReportStatus.DISMISSED },
        }),
        this.reportRepository.count(),
      ]);

    const formattedItems = items.map((r) => {
      let hlsUrl = r.reel?.media?.hlsKey
        ? this.storageService.getObjectUrl(r.reel.media.hlsKey, requestHost)
        : null;
      let mp4Url = r.reel?.media?.originalKey
        ? this.storageService.getObjectUrl(r.reel.media.originalKey, requestHost)
        : null;
      let thumbnailUrl = r.reel?.media?.thumbnailKey
        ? this.storageService.getObjectUrl(r.reel.media.thumbnailKey, requestHost)
        : null;

      let creatorAvatarUrl = r.reel?.user?.avatarUrl || null;
      if (creatorAvatarUrl && !creatorAvatarUrl.startsWith('http')) {
        creatorAvatarUrl = this.storageService.getObjectUrl(creatorAvatarUrl, requestHost);
      }

      let reporterAvatarUrl = r.reporter?.avatarUrl || null;
      if (reporterAvatarUrl && !reporterAvatarUrl.startsWith('http')) {
        reporterAvatarUrl = this.storageService.getObjectUrl(reporterAvatarUrl, requestHost);
      }

      return {
        id: r.id,
        reelId: r.reelId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        reporter: r.reporter
          ? {
              id: r.reporter.id,
              name: r.reporter.name,
              email: r.reporter.email,
              phone: r.reporter.phone,
              avatarUrl: reporterAvatarUrl,
            }
          : null,
        reviewedBy: r.reviewedBy
          ? {
              id: r.reviewedBy.id,
              name: r.reviewedBy.name,
            }
          : null,
        reel: r.reel
          ? {
              id: r.reel.id,
              title: r.reel.title,
              caption: r.reel.caption,
              category: r.reel.category,
              status: r.reel.status,
              createdAt: r.reel.createdAt,
              creator: r.reel.user
                ? {
                    id: r.reel.user.id,
                    name: r.reel.user.name,
                    email: r.reel.user.email,
                    avatarUrl: creatorAvatarUrl,
                  }
                : null,
              media: r.reel.media
                ? {
                    hlsUrl,
                    mp4Url,
                    thumbnailUrl,
                    duration: r.reel.media.duration,
                  }
                : null,
            }
          : null,
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: {
        total: totalCount,
        pending: pendingCount,
        resolved: resolvedCount,
        dismissed: dismissedCount,
      },
    };
  }

  /**
   * Admin: Update report status (e.g. DISMISSED, REVIEWED, RESOLVED) and notes.
   */
  async updateReportStatus(
    reportId: string,
    dto: UpdateReportStatusDto,
    adminId?: string,
  ) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    report.status = dto.status;
    if (dto.adminNotes !== undefined) {
      report.adminNotes = dto.adminNotes;
    }
    if (adminId) {
      report.reviewedById = adminId;
    }

    await this.reportRepository.save(report);

    return {
      success: true,
      message: `Report marked as ${dto.status}.`,
      report,
    };
  }

  /**
   * Admin: Take down reported reel (mark reel DELETED and resolve report).
   */
  async takedownReportedReel(reportId: string, adminId: string) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: { reel: true },
    });
    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    if (report.reel) {
      report.reel.status = ReelStatus.DELETED;
      await this.reelRepository.save(report.reel);

      // Async clean up assets in storage
      const s3Prefix = `reels/${report.reel.id}`;
      this.storageService.deleteFolder(s3Prefix).catch((err) => {
        console.error(`Failed to delete S3 folder for Reel ${report.reelId}:`, err);
      });
    }

    report.status = ReelReportStatus.RESOLVED;
    report.reviewedById = adminId;
    report.adminNotes = (report.adminNotes ? report.adminNotes + ' | ' : '') + 'Reel taken down by admin.';
    await this.reportRepository.save(report);

    return {
      success: true,
      message: 'Reel taken down successfully and report resolved.',
    };
  }
}

