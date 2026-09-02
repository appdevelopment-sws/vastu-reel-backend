import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteProfile } from './entities/favorite-profile.entity';
import { User } from '../users/entities/user.entity';
import { Follow } from '../follows/entities/follow.entity';
import { Reel, ReelStatus } from '../reels/entities/reel.entity';
import { ActivityLogService } from '../activity-logs/activity-log.service';
import { ActivityLogType } from '../activity-logs/entities/activity-log.entity';
import { QueryFavoriteProfilesDto } from './dto/query-favorite-profiles.dto';

export interface FormattedFavoriteProfileItem {
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
  favoritedAt: Date;
}

@Injectable()
export class FavoriteProfilesService {
  constructor(
    @InjectRepository(FavoriteProfile)
    private readonly favoriteProfileRepository: Repository<FavoriteProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(Reel)
    private readonly reelRepository: Repository<Reel>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Add a user/creator profile to favorites. Idempotent.
   */
  async favorite(
    userId: string,
    targetId: string,
  ): Promise<{ success: boolean; isFavorite: boolean; message: string }> {
    if (userId === targetId) {
      throw new BadRequestException('You cannot add your own profile to favourites.');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: targetId } });
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetId} not found.`);
    }

    const existing = await this.favoriteProfileRepository.findOne({
      where: { userId, favoriteProfileId: targetId },
    });

    if (existing) {
      return {
        success: true,
        isFavorite: true,
        message: 'Already in favourite profiles.',
      };
    }

    const favorite = this.favoriteProfileRepository.create({
      userId,
      favoriteProfileId: targetId,
    });
    await this.favoriteProfileRepository.save(favorite);

    // Fetch actor name for notification/activity log
    const actor = await this.userRepository.findOne({ where: { id: userId } });
    const actorName = actor?.name || 'Someone';

    await this.activityLogService.log({
      type: ActivityLogType.FOLLOW, // or appropriate activity type
      actorId: userId,
      targetUserId: targetId,
      message: `${actorName} added your profile to their favourites.`,
      isGlobal: false,
      metadata: { actorName, actorId: userId, action: 'favorite_profile' },
    });

    return {
      success: true,
      isFavorite: true,
      message: `${targetUser.name} added to your favourite profiles.`,
    };
  }

  /**
   * Remove a user/creator profile from favorites.
   */
  async unfavorite(
    userId: string,
    targetId: string,
  ): Promise<{ success: boolean; isFavorite: boolean; message: string }> {
    const existing = await this.favoriteProfileRepository.findOne({
      where: { userId, favoriteProfileId: targetId },
    });

    if (!existing) {
      return {
        success: true,
        isFavorite: false,
        message: 'Profile is not in your favourites.',
      };
    }

    await this.favoriteProfileRepository.remove(existing);

    return {
      success: true,
      isFavorite: false,
      message: 'Removed from favourite profiles.',
    };
  }

  /**
   * Check if target profile is in caller's favorites.
   */
  async isFavorite(userId: string, targetId: string): Promise<boolean> {
    const count = await this.favoriteProfileRepository.count({
      where: { userId, favoriteProfileId: targetId },
    });
    return count > 0;
  }

  /**
   * Get list of all favorite profile IDs for a user.
   */
  async getFavoriteProfileIds(userId: string): Promise<string[]> {
    const favorites = await this.favoriteProfileRepository.find({
      where: { userId },
      select: { favoriteProfileId: true },
    });
    return favorites.map((f) => f.favoriteProfileId);
  }

  /**
   * Get total count of favorite profiles.
   */
  async getFavoritesCount(userId: string): Promise<number> {
    return this.favoriteProfileRepository.count({ where: { userId } });
  }

  /**
   * Get paginated, searchable, sorted list of favorite creators.
   */
  async getFavorites(
    userId: string,
    query: QueryFavoriteProfilesDto,
  ): Promise<{
    items: FormattedFavoriteProfileItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const qb = this.favoriteProfileRepository
      .createQueryBuilder('fav')
      .innerJoinAndSelect('fav.favoriteProfile', 'targetUser')
      .where('fav.userId = :userId', { userId });

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(targetUser.name) LIKE :search OR LOWER(targetUser.username) LIKE :search OR LOWER(targetUser.profession) LIKE :search OR LOWER(targetUser.address) LIKE :search)',
        { search: searchPattern },
      );
    }

    if (query.sortBy === 'name') {
      qb.orderBy('targetUser.name', 'ASC');
    } else {
      qb.orderBy('fav.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [favs, total] = await qb.getManyAndCount();

    const items: FormattedFavoriteProfileItem[] = await Promise.all(
      favs.map(async (fav) => {
        const u = fav.favoriteProfile;
        const targetId = u.id;

        const [followersCount, followingCount, isFollowing, reelsCount] =
          await Promise.all([
            this.followRepository.count({ where: { followingId: targetId } }),
            this.followRepository.count({ where: { followerId: targetId } }),
            this.followRepository.count({
              where: { followerId: userId, followingId: targetId },
            }).then((c) => c > 0),
            this.reelRepository.count({
              where: { userId: targetId, status: ReelStatus.READY },
            }),
          ]);

        return {
          id: u.id,
          name: u.name || u.username || 'Creator',
          username: u.username || '',
          avatarUrl: u.avatarUrl || '',
          coverImageUrl: u.coverImageUrl || '',
          isVerified: u.isVerified ?? true,
          title: u.profession || 'Vastu Consultant',
          profession: u.profession || 'Real Estate Consultant',
          location: u.address || 'Patna, Bihar',
          bio: u.bio || '',
          highlights: u.highlights || '',
          rating: u.rating !== undefined ? Number(u.rating) : 4.8,
          ratingsCount: u.ratingsCount || 0,
          postsCount: reelsCount,
          followersCount,
          followingCount,
          isFollowing,
          isFavorite: true,
          whatsapp: u.whatsapp || u.phone || '',
          website: u.website || '',
          favoritedAt: fav.createdAt,
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
