import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewStatus } from './entities/review.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Reviews & Ratings')
@Controller(['reviews', 'api/v1/reviews'])
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({ summary: 'Submit a rating & review for a creator profile' })
  @ApiResponse({
    status: 201,
    description: 'Review submitted and set to PENDING approval.',
  })
  @ApiResponse({
    status: 409,
    description: 'User has already reviewed this profile.',
  })
  @ApiBearerAuth()
  @Post()
  async createReview(
    @CurrentUser('sub') reviewerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(reviewerId, dto);
  }

  @ApiOperation({ summary: 'Get approved reviews for a creator profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns approved reviews and aggregate rating score.',
  })
  @Public()
  @Get('profile/:targetUserId')
  async getApprovedReviews(@Param('targetUserId') targetUserId: string) {
    return this.reviewsService.getApprovedReviews(targetUserId);
  }

  @ApiOperation({
    summary: 'Check if current user has already reviewed this profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns review if existing (even if pending), or null.',
  })
  @ApiBearerAuth()
  @Get('my-review/:targetUserId')
  async getMyReview(
    @CurrentUser('sub') reviewerId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.reviewsService.getMyReview(reviewerId, targetUserId);
  }

  @ApiOperation({ summary: 'Admin: Approve or reject a review' })
  @ApiBearerAuth()
  @Patch(':id/status')
  async updateReviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.reviewsService.updateReviewStatus(id, dto.status);
  }

  @ApiOperation({ summary: 'Admin: Get all reviews awaiting moderation' })
  @ApiBearerAuth()
  @Get('admin/pending')
  async getPendingReviews() {
    return this.reviewsService.getPendingReviews();
  }

  @ApiOperation({ summary: 'Admin: Get all reviews (optional status filter)' })
  @ApiBearerAuth()
  @Get('admin/all')
  async getAllReviews(@Query('status') status?: ReviewStatus) {
    return this.reviewsService.getAllReviewsForAdmin(status);
  }
}
