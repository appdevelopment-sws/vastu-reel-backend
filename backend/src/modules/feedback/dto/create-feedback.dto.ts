import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackType } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'The feedback or suggestion text provided by user',
    example: 'It would be great to have a filter for Vastu north-facing homes on map view!',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    description: 'Type of feedback',
    enum: FeedbackType,
    default: FeedbackType.SUGGESTION,
    example: FeedbackType.SUGGESTION,
  })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;

  @ApiPropertyOptional({
    description: 'Device and platform info (e.g., iOS 17, Android 14, App v1.0.4)',
    maxLength: 255,
    example: 'Android 14 - Flutter App v1.0.0',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceInfo?: string;

  @ApiPropertyOptional({
    description: 'Optional contact email provided by user',
    maxLength: 150,
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactEmail?: string;
}
