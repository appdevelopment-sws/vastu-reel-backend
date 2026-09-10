import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityLogType } from './entities/activity-log.entity';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

export interface CreateActivityLogDto {
  type: ActivityLogType;
  actorId?: string | null;
  targetUserId?: string | null;
  reelId?: string | null;
  message: string;
  isGlobal?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepository: Repository<ActivityLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Creates a new activity log entry. Fire-and-forget safe.
   */
  async log(dto: CreateActivityLogDto): Promise<void> {
    try {
      const entry = this.logRepository.create({
        type: dto.type,
        actorId: dto.actorId ?? null,
        targetUserId: dto.targetUserId ?? null,
        reelId: dto.reelId ?? null,
        message: dto.message,
        isGlobal: dto.isGlobal ?? false,
        metadata: dto.metadata ?? null,
      });
      await this.logRepository.save(entry);

      // Dispatch push notification for targeted activity (likes, comments, follows)
      if (dto.targetUserId && dto.targetUserId !== dto.actorId) {
        let notifType = NotificationType.SYSTEM;
        let title = 'New Activity';
        if (dto.type === ActivityLogType.LIKE) {
          notifType = NotificationType.LIKE;
          title = 'New Like ❤️';
        } else if (dto.type === ActivityLogType.COMMENT) {
          notifType = NotificationType.COMMENT;
          title = 'New Comment 💬';
        } else if (dto.type === ActivityLogType.FOLLOW) {
          notifType = NotificationType.FOLLOW;
          title = 'New Follower 👤';
        } else if (dto.type === ActivityLogType.REEL_PUBLISHED) {
          notifType = NotificationType.REEL_PUBLISHED;
          title = 'New Reel 🎬';
        }

        this.notificationsService
          .sendActivityPush(
            'Vastu App',
            dto.targetUserId,
            notifType,
            title,
            dto.message,
            {
              reelId: dto.reelId,
              actorId: dto.actorId,
              activityType: dto.type,
              ...(dto.metadata || {}),
            },
          )
          .catch(() => {});
      }
    } catch (err) {
      // Non-fatal: log errors should never break the primary flow
      console.error('[ActivityLogService] Failed to log activity:', err);
    }
  }

  /**
   * Returns paginated activity for a given user:
   * - Global entries (visible to everyone)
   * - Entries targeted to this specific user
   */
  async getMyActivity(
    userId: string,
    page = 1,
    limit = 30,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.targetUserId = :userId', { userId })
      .orWhere(
        '(log.isGlobal = true AND log.actorId IN (SELECT following_id FROM follows WHERE follower_id = :userId))',
        { userId },
      )
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.formatEntry(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  /**
   * Returns paginated global-only activity (no auth required).
   */
  async getGlobalActivity(
    page = 1,
    limit = 30,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.isGlobal = :isGlobal', { isGlobal: true })
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.formatEntry(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  /**
   * Returns all platform activity logs for administrators with optional filtering by type & search.
   */
  async getAllActivity(
    page = 1,
    limit = 30,
    type?: string,
    search?: string,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const qb = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .orderBy('log.createdAt', 'DESC');

    if (type && type !== 'ALL') {
      qb.andWhere('log.type = :type', { type });
    }

    if (search && search.trim()) {
      qb.andWhere(
        '(LOWER(log.message) LIKE LOWER(:search) OR LOWER(actor.name) LIKE LOWER(:search) OR LOWER(actor.username) LIKE LOWER(:search))',
        { search: `%${search.trim()}%` },
      );
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((item) => this.formatEntry(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    };
  }

  private formatEntry(log: ActivityLog): Record<string, any> {
    const actorDisplayName = log.actor?.username
      ? `@${log.actor.username}`
      : log.actor?.name || log.metadata?.actorName || null;

    let message = log.message;
    if (actorDisplayName && message.startsWith('Someone ')) {
      message = message.replace(/^Someone\s+/, `${actorDisplayName} `);
    }

    return {
      id: log.id,
      type: log.type,
      message,
      isGlobal: log.isGlobal,
      actorId: log.actorId,
      actorName: actorDisplayName,
      targetUserId: log.targetUserId,
      reelId: log.reelId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}
