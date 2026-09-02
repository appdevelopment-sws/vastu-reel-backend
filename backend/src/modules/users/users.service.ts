import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Reel, ReelStatus } from '../reels/entities/reel.entity';
import { ReelView } from '../reels/entities/reel-view.entity';
import { ReelLike } from '../reels/entities/reel-like.entity';
import { ReelBookmark } from '../reels/entities/reel-bookmark.entity';
import { Comment } from '../reels/entities/comment.entity';
import { Follow } from '../follows/entities/follow.entity';
import { StorageService } from '../reels/services/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface FormattedUserResponse {
  id: string;
  username?: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  address?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  profession?: string;
  bio?: string;
  highlights?: string;
  whatsapp?: string;
  website?: string;
  rating?: number;
  ratingsCount?: number;
  isVerified?: boolean;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  roles?: string[];
  videoCount?: number;
  totalViews?: number;
  totalLikes?: number;
  followersCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Reel)
    private readonly reelRepository: Repository<Reel>,
    @InjectRepository(ReelView)
    private readonly viewRepository: Repository<ReelView>,
    @InjectRepository(ReelLike)
    private readonly likeRepository: Repository<ReelLike>,
    @InjectRepository(ReelBookmark)
    private readonly bookmarkRepository: Repository<ReelBookmark>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Helper to format user entity into API user response format
   */
  private formatUser(
    user: User,
    stats?: {
      videoCount?: number;
      totalViews?: number;
      totalLikes?: number;
      followersCount?: number;
    },
  ): FormattedUserResponse {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email || undefined,
      phone: user.phone || undefined,
      age: user.age || undefined,
      address: user.address || undefined,
      avatarUrl: user.avatarUrl || undefined,
      coverImageUrl: user.coverImageUrl || undefined,
      profession: user.profession || undefined,
      bio: user.bio || undefined,
      highlights: user.highlights || undefined,
      whatsapp: user.whatsapp || undefined,
      website: user.website || undefined,
      rating: user.rating !== undefined ? Number(user.rating) : 4.8,
      ratingsCount: user.ratingsCount || 0,
      isVerified: user.isVerified || false,
      isActive: user.isActive,
      status: user.isActive ? 'ACTIVE' : 'BLOCKED',
      roles: user.roles ? user.roles.map((r) => r.name) : [],
      videoCount: stats?.videoCount ?? 0,
      totalViews: stats?.totalViews ?? 0,
      totalLikes: stats?.totalLikes ?? 0,
      followersCount: stats?.followersCount ?? 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create a new user account
   */
  async create(createUserDto: CreateUserDto): Promise<FormattedUserResponse> {
    const emailNormalized = createUserDto.email.toLowerCase().trim();
    const usernameNormalized = createUserDto.username.toLowerCase().trim();

    const existingEmail = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Email address '${emailNormalized}' is already registered.`,
      );
    }

    const existingUsername = await this.userRepository.findOne({
      where: { username: usernameNormalized },
    });
    if (existingUsername) {
      throw new ConflictException(
        `Username '${usernameNormalized}' is already taken.`,
      );
    }

    const targetRoleName = createUserDto.roleName || 'USER';
    let role = await this.roleRepository.findOne({
      where: { name: targetRoleName },
    });

    if (!role) {
      role = this.roleRepository.create({
        name: targetRoleName,
        description: `${targetRoleName} role`,
      });
      await this.roleRepository.save(role);
    }

    const plainPassword = createUserDto.password || 'Password123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = this.userRepository.create({
      username: usernameNormalized,
      name: createUserDto.name.trim(),
      email: emailNormalized,
      phone: createUserDto.phone ? createUserDto.phone.trim() : undefined,
      age: createUserDto.age,
      address: createUserDto.address ? createUserDto.address.trim() : undefined,
      avatarUrl: createUserDto.avatarUrl,
      coverImageUrl: createUserDto.coverImageUrl,
      profession: createUserDto.profession,
      bio: createUserDto.bio,
      highlights: createUserDto.highlights,
      whatsapp: createUserDto.whatsapp,
      website: createUserDto.website,
      password: hashedPassword,
      isActive:
        createUserDto.isActive !== undefined ? createUserDto.isActive : true,
      roles: [role],
    });

    const savedUser = await this.userRepository.save(user);
    return this.formatUser(savedUser);
  }

  /**
   * Get all users with optional filtering and aggregated video/engagement counts
   */
  async findAll(params?: {
    search?: string;
    status?: string;
    role?: string;
  }): Promise<FormattedUserResponse[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles');

    if (params?.search && params.search.trim().length > 0) {
      const search = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search OR user.phone LIKE :search)',
        { search },
      );
    }

    if (params?.status && params.status.trim().length > 0) {
      const statusUpper = params.status.trim().toUpperCase();
      if (statusUpper === 'ACTIVE') {
        qb.andWhere('user.isActive = :isActive', { isActive: true });
      } else if (statusUpper === 'INACTIVE' || statusUpper === 'BLOCKED') {
        qb.andWhere('user.isActive = :isActive', { isActive: false });
      }
    }

    if (params?.role && params.role.trim().length > 0) {
      const roleUpper = params.role.trim().toUpperCase();
      qb.andWhere('UPPER(roles.name) = :roleName', { roleName: roleUpper });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const users = await qb.getMany();

    // Query aggregated stats for these users in batch
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return [];
    }

    // Video counts & total views per user
    const reelStats = await this.reelRepository
      .createQueryBuilder('reel')
      .select('reel.userId', 'userId')
      .addSelect('COUNT(reel.id)', 'videoCount')
      .addSelect('COALESCE(SUM(reel.viewsCount), 0)', 'totalViews')
      .where('reel.userId IN (:...userIds)', { userIds })
      .andWhere('reel.status = :status', {
        status: ReelStatus.READY,
      })
      .groupBy('reel.userId')
      .getRawMany();

    const reelStatsMap = new Map<string, { videoCount: number; totalViews: number }>();
    for (const r of reelStats) {
      reelStatsMap.set(r.userId, {
        videoCount: parseInt(r.videoCount, 10) || 0,
        totalViews: parseInt(r.totalViews, 10) || 0,
      });
    }

    // Followers counts per user
    const followStats = await this.followRepository
      .createQueryBuilder('follow')
      .select('follow.followingId', 'userId')
      .addSelect('COUNT(follow.id)', 'followersCount')
      .where('follow.followingId IN (:...userIds)', { userIds })
      .groupBy('follow.followingId')
      .getRawMany();

    const followStatsMap = new Map<string, number>();
    for (const f of followStats) {
      followStatsMap.set(f.userId, parseInt(f.followersCount, 10) || 0);
    }

    return users.map((u) => {
      const rStat = reelStatsMap.get(u.id);
      const fStat = followStatsMap.get(u.id);
      return this.formatUser(u, {
        videoCount: rStat?.videoCount ?? 0,
        totalViews: rStat?.totalViews ?? 0,
        followersCount: fStat ?? 0,
      });
    });
  }

  /**
   * Find single user by ID with high-level stats
   */
  async findOne(id: string): Promise<FormattedUserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const videoCount = await this.reelRepository.count({
      where: { userId: id, status: ReelStatus.READY },
    });

    const reels = await this.reelRepository.find({
      where: { userId: id, status: ReelStatus.READY },
      select: { viewsCount: true },
    });
    const totalViews = reels.reduce((acc, r) => acc + Number(r.viewsCount || 0), 0);

    const followersCount = await this.followRepository.count({
      where: { followingId: id },
    });

    return this.formatUser(user, {
      videoCount,
      totalViews,
      followersCount,
    });
  }

  /**
   * Get detailed Creator Summary & Performance KPIs
   */
  async getCreatorSummary(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const allReels = await this.reelRepository.find({
      where: { userId, status: Not(ReelStatus.DELETED) },
      relations: { likes: true, comments: true, bookmarks: true },
    });

    const readyReels = allReels.filter((r) => r.status === ReelStatus.READY).length;
    const processingReels = allReels.filter((r) => r.status === ReelStatus.PROCESSING || r.status === ReelStatus.UPLOADING).length;
    const failedReels = allReels.filter((r) => r.status === ReelStatus.FAILED).length;
    const totalReels = allReels.length;

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalBookmarks = 0;

    for (const r of allReels) {
      totalViews += Number(r.viewsCount || 0);
      totalLikes += r.likes ? r.likes.length : 0;
      totalComments += r.comments ? r.comments.length : 0;
      totalBookmarks += r.bookmarks ? r.bookmarks.length : 0;
    }

    const followersCount = await this.followRepository.count({
      where: { followingId: userId },
    });
    const followingCount = await this.followRepository.count({
      where: { followerId: userId },
    });

    const totalEngagements = totalLikes + totalComments + totalBookmarks;
    const engagementRate =
      totalViews > 0
        ? parseFloat(((totalEngagements / totalViews) * 100).toFixed(2))
        : 0;

    const avgViewsPerReel =
      readyReels > 0 ? Math.round(totalViews / readyReels) : 0;

    return {
      user: this.formatUser(user, {
        videoCount: readyReels,
        totalViews,
        totalLikes,
        followersCount,
      }),
      stats: {
        totalReels: readyReels,
        allUploadedReels: totalReels,
        readyReels,
        processingReels,
        failedReels,
        totalViews,
        totalLikes,
        totalComments,
        totalBookmarks,
        followersCount,
        followingCount,
        engagementRate,
        avgViewsPerReel,
        estimatedReach: Math.round(totalViews * 1.35),
      },
    };
  }

  /**
   * Get all reels uploaded by a specific creator
   */
  async getCreatorReels(
    userId: string,
    query: { page?: number; limit?: number; status?: string; search?: string },
    requestHost?: string,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.reelRepository
      .createQueryBuilder('reel')
      .leftJoinAndSelect('reel.media', 'media')
      .leftJoinAndSelect('reel.likes', 'likes')
      .leftJoinAndSelect('reel.comments', 'comments')
      .leftJoinAndSelect('reel.bookmarks', 'bookmarks')
      .where('reel.userId = :userId', { userId });

    if (query.status && query.status !== 'ALL') {
      qb.andWhere('reel.status = :status', { status: query.status });
    } else {
      qb.andWhere('reel.status != :deletedStatus', {
        deletedStatus: ReelStatus.DELETED,
      });
    }

    if (query.search && query.search.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(reel.title) LIKE :search OR LOWER(reel.caption) LIKE :search OR LOWER(reel.category) LIKE :search)',
        { search },
      );
    }

    qb.orderBy('reel.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [reels, total] = await qb.getManyAndCount();

    const items = reels.map((reel) => {
      let thumbnailUrl = '';
      let videoUrl = '';
      let hlsMasterPlaylistUrl = '';

      if (reel.media) {
        if (reel.media.thumbnailKey) {
          thumbnailUrl = this.storageService.getObjectUrl(
            reel.media.thumbnailKey,
            requestHost,
          );
        } else if (reel.media.originalKey) {
          thumbnailUrl = this.storageService.getObjectUrl(
            reel.media.originalKey,
            requestHost,
          );
        }

        if (reel.media.hlsKey) {
          hlsMasterPlaylistUrl = this.storageService.getObjectUrl(
            reel.media.hlsKey,
            requestHost,
          );
          videoUrl = hlsMasterPlaylistUrl;
        } else if (reel.media.originalKey) {
          videoUrl = this.storageService.getObjectUrl(
            reel.media.originalKey,
            requestHost,
          );
        }
      }

      return {
        id: reel.id,
        title: reel.title || 'Untitled Reel',
        caption: reel.caption,
        category: reel.category || 'Vastu',
        subCategory: reel.subCategory,
        propertyType: reel.propertyType,
        element: reel.element,
        location: reel.location,
        status: reel.status,
        visibility: reel.visibility,
        viewsCount: reel.viewsCount || 0,
        likesCount: reel.likes ? reel.likes.length : 0,
        commentsCount: reel.comments ? reel.comments.length : 0,
        bookmarksCount: reel.bookmarks ? reel.bookmarks.length : 0,
        thumbnailUrl,
        videoUrl,
        hlsMasterPlaylistUrl,
        duration: reel.media?.duration || 0,
        width: reel.media?.width || 1080,
        height: reel.media?.height || 1920,
        createdAt: reel.createdAt,
        updatedAt: reel.updatedAt,
      };
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Creator Analytics & Time Series
   */
  async getCreatorAnalytics(
    userId: string,
    query: { timeframe?: string; metric?: string },
  ) {
    const timeframe = query.timeframe || '28d';
    let days = 28;
    if (timeframe === '7d') days = 7;
    else if (timeframe === '90d') days = 90;
    else if (timeframe === 'all') days = 180;

    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const reels = await this.reelRepository.find({
      where: { userId, status: Not(ReelStatus.DELETED) },
      relations: { likes: true, comments: true, bookmarks: true },
    });

    // Group views, likes, comments by date points
    const pointsCount = Math.min(days, 14);
    const stepMs = (days * 24 * 60 * 60 * 1000) / pointsCount;
    const dataPoints: {
      date: string;
      label: string;
      views: number;
      likes: number;
      comments: number;
    }[] = [];

    const totalViews = reels.reduce((acc, r) => acc + Number(r.viewsCount || 0), 0);
    const totalLikes = reels.reduce((acc, r) => acc + (r.likes?.length || 0), 0);
    const totalComments = reels.reduce(
      (acc, r) => acc + (r.comments?.length || 0),
      0,
    );

    const reelIds = reels.map((r) => r.id);

    for (let i = 0; i < pointsCount; i++) {
      const bucketStart = new Date(currentStart.getTime() + i * stepMs);
      const bucketEnd = new Date(bucketStart.getTime() + stepMs);
      const isoDate = bucketStart.toISOString().split('T')[0];
      const label = bucketStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      let views = 0;
      let likes = 0;
      let comments = 0;

      if (reelIds.length > 0) {
        views = await this.viewRepository
          .createQueryBuilder('view')
          .where('view.reelId IN (:...reelIds)', { reelIds })
          .andWhere('view.createdAt BETWEEN :start AND :end', { start: bucketStart, end: bucketEnd })
          .getCount();

        likes = await this.likeRepository
          .createQueryBuilder('like')
          .where('like.reelId IN (:...reelIds)', { reelIds })
          .andWhere('like.createdAt BETWEEN :start AND :end', { start: bucketStart, end: bucketEnd })
          .getCount();

        comments = await this.commentRepository
          .createQueryBuilder('comment')
          .where('comment.reelId IN (:...reelIds)', { reelIds })
          .andWhere('comment.createdAt BETWEEN :start AND :end', { start: bucketStart, end: bucketEnd })
          .getCount();
      }

      dataPoints.push({
        date: isoDate,
        label,
        views,
        likes,
        comments,
      });
    }

    // Category distribution
    const categoryMap = new Map<string, { count: number; views: number }>();
    for (const r of reels) {
      const cat = r.category || 'General Vastu';
      const existing = categoryMap.get(cat) || { count: 0, views: 0 };
      categoryMap.set(cat, {
        count: existing.count + 1,
        views: existing.views + Number(r.viewsCount || 0),
      });
    }

    const categories = Array.from(categoryMap.entries()).map(
      ([category, val]) => ({
        category,
        reelsCount: val.count,
        views: val.views,
        percentage:
          totalViews > 0
            ? parseFloat(((val.views / totalViews) * 100).toFixed(1))
            : Math.round((val.count / (reels.length || 1)) * 100),
      }),
    );

    return {
      timeframe,
      dataPoints,
      categories,
      totals: {
        totalReels: reels.length,
        totalViews,
        totalLikes,
        totalComments,
      },
    };
  }

  /**
   * Block / Unblock user account status
   */
  async updateStatus(
    id: string,
    isActive: boolean,
    reason?: string,
  ): Promise<{ success: boolean; message: string; user: FormattedUserResponse }> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    user.isActive = isActive;
    const savedUser = await this.userRepository.save(user);

    const actionText = isActive ? 'unblocked and activated' : 'blocked';
    return {
      success: true,
      message: `User account '${user.name}' has been ${actionText}.${reason ? ` Reason: ${reason}` : ''}`,
      user: this.formatUser(savedUser),
    };
  }

  /**
   * Toggle user verification status (isVerified)
   */
  async updateVerification(
    id: string,
    isVerified: boolean,
  ): Promise<{ success: boolean; message: string; user: FormattedUserResponse }> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    user.isVerified = isVerified;
    const savedUser = await this.userRepository.save(user);

    return {
      success: true,
      message: `User account '${user.name}' verification status set to ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}.`,
      user: this.formatUser(savedUser),
    };
  }

  /**
   * Get Creator Leaderboard (Top performing creators ranked by views, reels, followers)
   */
  async getCreatorLeaderboard(limit = 10, sortBy = 'views') {
    const allUsers = await this.findAll();

    // Filter creators or users with uploaded videos
    const creators = allUsers.filter(
      (u) =>
        (u.roles || []).some((r) => r === 'CREATOR' || r === 'ADMIN') ||
        (u.videoCount || 0) > 0,
    );

    creators.sort((a, b) => {
      if (sortBy === 'followers') return (b.followersCount || 0) - (a.followersCount || 0);
      if (sortBy === 'videos') return (b.videoCount || 0) - (a.videoCount || 0);
      return (b.totalViews || 0) - (a.totalViews || 0);
    });

    const ranked = creators.slice(0, limit).map((c, index) => ({
      ...c,
      rank: index + 1,
      performanceBadge: index === 0 ? '🏆 Top Creator' : index < 3 ? '⭐ Star Astrologer' : '🔥 Rising Expert',
    }));

    return {
      total: creators.length,
      sortBy,
      items: ranked,
    };
  }


  /**
   * Update user details by ID
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<FormattedUserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    if (updateUserDto.username) {
      const usernameNormalized = updateUserDto.username.toLowerCase().trim();
      if (usernameNormalized !== user.username) {
        const existing = await this.userRepository.findOne({
          where: { username: usernameNormalized },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Username '${usernameNormalized}' is already taken by another account.`,
          );
        }
        user.username = usernameNormalized;
      }
    }

    if (updateUserDto.email) {
      const emailNormalized = updateUserDto.email.toLowerCase().trim();
      if (emailNormalized !== user.email) {
        const existing = await this.userRepository.findOne({
          where: { email: emailNormalized },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Email address '${emailNormalized}' is already registered by another account.`,
          );
        }
        user.email = emailNormalized;
      }
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name.trim();
    }
    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone
        ? updateUserDto.phone.trim()
        : (null as any);
    }
    if (updateUserDto.age !== undefined) {
      user.age = updateUserDto.age;
    }
    if (updateUserDto.address !== undefined) {
      user.address = updateUserDto.address
        ? updateUserDto.address.trim()
        : (null as any);
    }
    if (updateUserDto.avatarUrl !== undefined) {
      user.avatarUrl = updateUserDto.avatarUrl;
    }
    if (updateUserDto.coverImageUrl !== undefined) {
      user.coverImageUrl = updateUserDto.coverImageUrl;
    }
    if (updateUserDto.profession !== undefined) {
      user.profession = updateUserDto.profession;
    }
    if (updateUserDto.bio !== undefined) {
      user.bio = updateUserDto.bio;
    }
    if (updateUserDto.highlights !== undefined) {
      user.highlights = updateUserDto.highlights;
    }
    if (updateUserDto.whatsapp !== undefined) {
      user.whatsapp = updateUserDto.whatsapp;
    }
    if (updateUserDto.website !== undefined) {
      user.website = updateUserDto.website;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }
    if (updateUserDto.password && updateUserDto.password.trim().length > 0) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.roleName) {
      const targetRoleName = updateUserDto.roleName.trim().toUpperCase();
      let role = await this.roleRepository.findOne({
        where: { name: targetRoleName },
      });
      if (!role) {
        role = this.roleRepository.create({
          name: targetRoleName,
          description: `${targetRoleName} role`,
        });
        await this.roleRepository.save(role);
      }
      user.roles = [role];
    }

    const updatedUser = await this.userRepository.save(user);
    return this.formatUser(updatedUser);
  }

  /**
   * Delete or deactivate user by ID
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    await this.userRepository.remove(user);
    return {
      success: true,
      message: `User '${user.name}' has been successfully deleted.`,
    };
  }

  /**
   * Generates a pre-signed S3/R2 URL for direct client-side upload (Avatar or Cover)
   */
  async getPresignedUploadUrl(
    userId: string,
    mimeType: string = 'image/jpeg',
    type: 'avatar' | 'cover' = 'avatar',
    requestHost?: string,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    if (!userId) {
      throw new BadRequestException('User ID is required for upload URL generation.');
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const folder = type === 'cover' ? 'covers' : 'avatars';
    const key = `users/${folder}/${userId}/${Date.now()}.${ext}`;

    const uploadUrl = await this.storageService.getPresignedUploadUrl(
      key,
      mimeType,
      900,
      requestHost,
    );

    const publicUrl = this.storageService.getObjectUrl(key, requestHost);

    return {
      uploadUrl,
      key,
      publicUrl,
    };
  }

  /**
   * Upload user media (avatar or cover image)
   */
  async uploadMedia(
    userId: string,
    file: Express.Multer.File,
    type: 'avatar' | 'cover' = 'avatar',
    requestHost?: string,
  ): Promise<{ url: string; field: string }> {
    if (!file) {
      throw new BadRequestException('No image file provided.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const ext = file.originalname ? file.originalname.split('.').pop() || 'jpg' : 'jpg';
    const folder = type === 'cover' ? 'covers' : 'avatars';
    const storageKey = `users/${folder}/${userId}/${Date.now()}.${ext}`;

    const url = await this.storageService.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimetype || 'image/jpeg',
      requestHost,
    );

    if (type === 'cover') {
      user.coverImageUrl = url;
    } else {
      user.avatarUrl = url;
    }
    await this.userRepository.save(user);

    return {
      url,
      field: type === 'cover' ? 'coverImageUrl' : 'avatarUrl',
    };
  }
}
