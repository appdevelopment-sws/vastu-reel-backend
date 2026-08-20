import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActivityLogType } from './entities/activity-log.entity';

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
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.is_global = :isGlobal', { isGlobal: true })
      .orWhere('log.target_user_id = :userId', { userId })
      .orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.formatEntry(item)),
      total,
      page,
      limit,
    };
  }

  /**
   * Returns paginated global-only activity (no auth required).
   */
  async getGlobalActivity(
    page = 1,
    limit = 30,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .where('log.is_global = :isGlobal', { isGlobal: true })
      .orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.formatEntry(item)),
      total,
      page,
      limit,
    };
  }

  private formatEntry(log: ActivityLog): Record<string, any> {
    return {
      id: log.id,
      type: log.type,
      message: log.message,
      isGlobal: log.isGlobal,
      actorId: log.actorId,
      actorName: log.actor?.name ?? null,
      targetUserId: log.targetUserId,
      reelId: log.reelId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}
