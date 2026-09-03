import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '../entities/review.entity';

export class UpdateReviewStatusDto {
  @ApiProperty({
    description: 'Updated status for the review',
    enum: [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
    example: ReviewStatus.APPROVED,
  })
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;
}
