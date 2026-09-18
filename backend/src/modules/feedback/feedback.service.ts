import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Feedback, FeedbackStatus } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * Record new feedback or suggestion submitted from app or web
   */
  async createFeedback(userId: string | undefined, dto: CreateFeedbackDto) {
    const feedback = this.feedbackRepository.create({
      userId: userId || undefined,
      content: dto.content.trim(),
      type: dto.type,
      deviceInfo: dto.deviceInfo,
      contactEmail: dto.contactEmail,
      status: FeedbackStatus.PENDING,
    });

    return await this.feedbackRepository.save(feedback);
  }

  /**
   * Find all feedbacks with optional status filter, search query, and pagination
   */
  async findAll(status?: FeedbackStatus, search?: string, page = 1, limit = 50) {
    const query = this.feedbackRepository
      .createQueryBuilder('fb')
      .leftJoinAndSelect('fb.user', 'user')
      .orderBy('fb.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere('fb.status = :status', { status });
    }

    if (search && search.trim().length > 0) {
      query.andWhere(
        '(fb.content LIKE :search OR user.name LIKE :search OR user.email LIKE :search OR fb.contactEmail LIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    const [items, total] = await query.getManyAndCount();

    // Also get quick status counts for dashboard metrics
    const statsQuery = await this.feedbackRepository
      .createQueryBuilder('fb')
      .select('fb.status', 'status')
      .addSelect('COUNT(fb.id)', 'count')
      .groupBy('fb.status')
      .getRawMany();

    const stats = {
      TOTAL: total,
      PENDING: 0,
      REVIEWED: 0,
      RESOLVED: 0,
      ARCHIVED: 0,
    };

    let calculatedTotal = 0;
    statsQuery.forEach((row) => {
      const cnt = parseInt(row.count, 10) || 0;
      calculatedTotal += cnt;
      if (row.status in stats) {
        (stats as any)[row.status] = cnt;
      }
    });
    stats.TOTAL = calculatedTotal;

    return {
      items,
      total,
      page,
      limit,
      stats,
    };
  }

  /**
   * Find a single feedback entry by ID
   */
  async findOne(id: string) {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!feedback) {
      throw new NotFoundException(`Feedback #${id} not found`);
    }
    return feedback;
  }

  /**
   * Update feedback status and internal admin notes
   */
  async updateStatus(id: string, dto: UpdateFeedbackStatusDto) {
    const feedback = await this.findOne(id);
    feedback.status = dto.status;
    if (dto.adminNotes !== undefined) {
      feedback.adminNotes = dto.adminNotes;
    }
    return await this.feedbackRepository.save(feedback);
  }

  /**
   * Delete feedback entry
   */
  async remove(id: string) {
    const feedback = await this.findOne(id);
    await this.feedbackRepository.remove(feedback);
    return { success: true, message: 'Feedback entry deleted successfully.' };
  }
}
