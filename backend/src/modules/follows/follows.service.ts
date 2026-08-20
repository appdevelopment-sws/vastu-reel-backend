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

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
