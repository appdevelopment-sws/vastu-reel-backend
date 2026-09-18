import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackStatus } from '../entities/feedback.entity';

export class UpdateFeedbackStatusDto {
  @ApiProperty({
    description: 'Updated status for the feedback',
    enum: FeedbackStatus,
    example: FeedbackStatus.REVIEWED,
  })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;

  @ApiPropertyOptional({
    description: 'Internal admin notes or resolution summary',
    example: 'Feature planned for sprint 4 roadmap.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
