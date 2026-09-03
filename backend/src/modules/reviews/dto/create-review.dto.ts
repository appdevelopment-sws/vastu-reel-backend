import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Target creator/user ID to be reviewed',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review comment explaining the experience',
    maxLength: 1000,
    example: 'Very professional agent, helped us find an authentic Vastu-compliant home.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;

  @ApiPropertyOptional({
    description: 'Associated property or transaction title',
    maxLength: 255,
    example: '3 BHK Luxury Apartment, Patna',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  propertyDetails?: string;
}
