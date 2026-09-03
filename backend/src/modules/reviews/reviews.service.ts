import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Submit a new rating & review for a user/creator profile.
   * Enforces 1 review per reviewer per profile.
   */
  async createReview(reviewerId: string, dto: CreateReviewDto) {
    if (reviewerId === dto.targetUserId) {
      throw new BadRequestException('You cannot review your own profile.');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user profile not found.');
    }

    // Check if the user already submitted a review
    const existing = await this.reviewRepository.findOne({
      where: {
        reviewerId,
        targetUserId: dto.targetUserId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'You have already submitted a review for this profile.',
      );
    }

    const review = this.reviewRepository.create({
      reviewerId,
      targetUserId: dto.targetUserId,
      rating: dto.rating,
      comment: dto.comment,
      propertyDetails: dto.propertyDetails,
      status: ReviewStatus.PENDING,
    });

    const saved = await this.reviewRepository.save(review);

    return {
      message:
        'Review submitted successfully. It will be visible once approved by admin.',
      review: saved,
    };
  }

  /**
   * Get all approved reviews for a given creator/agent profile.
   */
  async getApprovedReviews(targetUserId: string) {
    const reviews = await this.reviewRepository.find({
      where: {
        targetUserId,
        status: ReviewStatus.APPROVED,
      },
      relations: { reviewer: true },
      order: {
        createdAt: 'DESC',
      },
    });

    // Compute stats dynamically
    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.target_user_id = :targetUserId', { targetUserId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne();

    const avgRating = stats?.avgRating
      ? parseFloat(Number(stats.avgRating).toFixed(1))
      : 0;
    const totalCount = stats?.count ? parseInt(stats.count, 10) : 0;

    return {
      stats: {
        averageRating: avgRating,
        totalReviews: totalCount,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        propertyDetails: r.propertyDetails,
        status: r.status,
        createdAt: r.createdAt,
        reviewer: {
          id: r.reviewer?.id,
          name: r.reviewer?.name,
          username: r.reviewer?.username,
          avatarUrl: r.reviewer?.avatarUrl,
        },
      })),
    };
  }

  /**
   * Check if the authenticated user has already reviewed the given profile.
   */
  async getMyReview(reviewerId: string, targetUserId: string) {
    const review = await this.reviewRepository.findOne({
      where: {
        reviewerId,
        targetUserId,
      },
      relations: { reviewer: true },
    });

    if (!review) {
      return null;
    }

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      propertyDetails: review.propertyDetails,
      status: review.status,
      createdAt: review.createdAt,
    };
  }

  /**
   * Admin: Approve or reject a review.
   * Updates target user's aggregated rating when approved.
   */
  async updateReviewStatus(id: string, status: ReviewStatus) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    review.status = status;
    await this.reviewRepository.save(review);

    // If approved, update target user's aggregated rating in users table
    if (status === ReviewStatus.APPROVED) {
      await this.recalculateUserRating(review.targetUserId);
    }

    return {
      message: `Review status updated to ${status}`,
      review,
    };
  }

  /**
   * Admin: Get all reviews awaiting moderation.
   */
  async getPendingReviews() {
    return this.reviewRepository.find({
      where: {
        status: ReviewStatus.PENDING,
      },
      relations: { reviewer: true, targetUser: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Admin: Get all reviews with optional status filter.
   */
  async getAllReviewsForAdmin(status?: ReviewStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    return this.reviewRepository.find({
      where,
      relations: { reviewer: true, targetUser: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Recalculates and persists average rating & count for a user.
   */
  private async recalculateUserRating(targetUserId: string) {
    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.target_user_id = :targetUserId', { targetUserId })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .getRawOne();

    const avg = stats?.avgRating
      ? parseFloat(Number(stats.avgRating).toFixed(1))
      : 4.8;
    const count = stats?.count ? parseInt(stats.count, 10) : 0;

    await this.userRepository.update(targetUserId, {
      rating: avg,
      ratingsCount: count,
    });
  }
}
