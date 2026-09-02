import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { ActivityLogService } from '../activity-logs/activity-log.service';
import { ActivityLogType } from '../activity-logs/entities/activity-log.entity';
import { User } from '../users/entities/user.entity';
import { Reel, ReelStatus } from '../reels/entities/reel.entity';
import { FavoriteProfile } from '../favorite-profiles/entities/favorite-profile.entity';
import { QueryFollowsDto } from './dto/query-follows.dto';

export interface FormattedFollowUserItem {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  coverImageUrl: string;
  isVerified: boolean;
  title: string;
  profession: string;
  location: string;
  bio: string;
  highlights: string;
  rating: number;
  ratingsCount: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFavorite: boolean;
  whatsapp: string;
  website: string;
  followedAt: Date;
}

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Reel)
    private readonly reelRepository: Repository<Reel>,
    @InjectRepository(FavoriteProfile)
    private readonly favoriteProfileRepository: Repository<FavoriteProfile>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Follow a user. Idempotent — silently succeeds if already following.
   */
  async follow(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: followingId } });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${followingId} not found.`);
    }

    const existing = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      return { success: true, message: 'Already following.' };
    }

    const follow = this.followRepository.create({ followerId, followingId });
    await this.followRepository.save(follow);

    // Fetch actor name for the activity message
    const actor = await this.userRepository.findOne({ where: { id: followerId } });
    const actorName = actor?.name ?? 'Someone';

    // Log the follow activity (personal — only target user sees this)
    await this.activityLogService.log({
      type: ActivityLogType.FOLLOW,
      actorId: followerId,
      targetUserId: followingId,
      message: `${actorName} started following you.`,
      isGlobal: false,
      metadata: { actorName, actorId: followerId },
    });

    return { success: true, message: `You are now following ${targetUser.name}.` };
  }

  /**
   * Unfollow a user.
   */
  async unfollow(followerId: string, followingId: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.followRepository.findOne({
      where: { followerId, followingId },
    });

    if (!existing) {
      return { success: true, message: 'Not following.' };
    }

    await this.followRepository.remove(existing);
    return { success: true, message: 'Unfollowed successfully.' };
  }

  /**
   * Check if follower is following followingId.
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.followRepository.count({
      where: { followerId, followingId },
    });
    return count > 0;
  }

  /**
   * Get count of followers for a user.
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.followRepository.count({ where: { followingId: userId } });
  }

  /**
   * Get count of users this user is following.
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.followRepository.count({ where: { followerId: userId } });
  }

  /**
   * Get list of user IDs that the given user follows.
   */
  async getFollowingIds(userId: string): Promise<string[]> {
    const follows = await this.followRepository.find({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return follows.map((f) => f.followingId);
  }

  /**
   * Get paginated, searchable list of followers for a user.
   */
  async getFollowers(
    targetUserId: string,
    requestingUserId: string | null,
    query: QueryFollowsDto,
  ): Promise<{
    items: FormattedFollowUserItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const qb = this.followRepository
      .createQueryBuilder('follow')
      .innerJoinAndSelect('follow.follower', 'user')
      .where('follow.followingId = :targetUserId', { targetUserId });

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.profession) LIKE :search OR LOWER(user.address) LIKE :search)',
        { search: searchPattern },
      );
    }

    qb.orderBy('follow.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [follows, total] = await qb.getManyAndCount();

    const items: FormattedFollowUserItem[] = await Promise.all(
      follows.map(async (f) => {
        const u = f.follower;
        const uId = u.id;

        const [followersCount, followingCount, isFollowing, isFavorite, reelsCount] =
          await Promise.all([
            this.followRepository.count({ where: { followingId: uId } }),
            this.followRepository.count({ where: { followerId: uId } }),
            requestingUserId
              ? this.followRepository.count({
                  where: { followerId: requestingUserId, followingId: uId },
                }).then((c) => c > 0)
              : Promise.resolve(false),
            requestingUserId
              ? this.favoriteProfileRepository.count({
                  where: { userId: requestingUserId, favoriteProfileId: uId },
                }).then((c) => c > 0)
              : Promise.resolve(false),
            this.reelRepository.count({
              where: { userId: uId, status: ReelStatus.READY },
            }),
          ]);

        return {
          id: u.id,
          name: u.name || u.username || 'User',
          username: u.username || '',
          avatarUrl: u.avatarUrl || '',
          coverImageUrl: u.coverImageUrl || '',
          isVerified: u.isVerified ?? false,
          title: u.profession || 'Vastu Member',
          profession: u.profession || 'Real Estate Member',
          location: u.address || 'Patna, Bihar',
          bio: u.bio || '',
          highlights: u.highlights || '',
          rating: u.rating !== undefined ? Number(u.rating) : 4.8,
          ratingsCount: u.ratingsCount || 0,
          postsCount: reelsCount,
          followersCount,
          followingCount,
          isFollowing,
          isFavorite,
          whatsapp: u.whatsapp || u.phone || '',
          website: u.website || '',
          followedAt: f.createdAt,
        };
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get paginated, searchable list of users that a target user is following.
   */
  async getFollowing(
    targetUserId: string,
    requestingUserId: string | null,
    query: QueryFollowsDto,
  ): Promise<{
    items: FormattedFollowUserItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const qb = this.followRepository
      .createQueryBuilder('follow')
      .innerJoinAndSelect('follow.following', 'user')
      .where('follow.followerId = :targetUserId', { targetUserId });

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.profession) LIKE :search OR LOWER(user.address) LIKE :search)',
        { search: searchPattern },
      );
    }

    qb.orderBy('follow.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [follows, total] = await qb.getManyAndCount();

    const items: FormattedFollowUserItem[] = await Promise.all(
      follows.map(async (f) => {
        const u = f.following;
        const uId = u.id;

        const [followersCount, followingCount, isFollowing, isFavorite, reelsCount] =
          await Promise.all([
            this.followRepository.count({ where: { followingId: uId } }),
            this.followRepository.count({ where: { followerId: uId } }),
            requestingUserId
              ? this.followRepository.count({
                  where: { followerId: requestingUserId, followingId: uId },
                }).then((c) => c > 0)
              : Promise.resolve(false),
            requestingUserId
              ? this.favoriteProfileRepository.count({
                  where: { userId: requestingUserId, favoriteProfileId: uId },
                }).then((c) => c > 0)
              : Promise.resolve(false),
            this.reelRepository.count({
              where: { userId: uId, status: ReelStatus.READY },
            }),
          ]);

        return {
          id: u.id,
          name: u.name || u.username || 'User',
          username: u.username || '',
          avatarUrl: u.avatarUrl || '',
          coverImageUrl: u.coverImageUrl || '',
          isVerified: u.isVerified ?? false,
          title: u.profession || 'Vastu Member',
          profession: u.profession || 'Real Estate Member',
          location: u.address || 'Patna, Bihar',
          bio: u.bio || '',
          highlights: u.highlights || '',
          rating: u.rating !== undefined ? Number(u.rating) : 4.8,
          ratingsCount: u.ratingsCount || 0,
          postsCount: reelsCount,
          followersCount,
          followingCount,
          isFollowing,
          isFavorite,
          whatsapp: u.whatsapp || u.phone || '',
          website: u.website || '',
          followedAt: f.createdAt,
        };
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
