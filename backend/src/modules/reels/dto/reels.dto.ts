import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export function MaxWords(maxWords: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxWords',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxWords],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return true;
          const trimmed = value.trim();
          if (!trimmed) return true;
          const words = trimmed.split(/\s+/).length;
          return words <= args.constraints[0];
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not exceed ${args.constraints[0]} words`;
        },
      },
    });
  };
}

export class InitUploadDto {
  @ApiProperty({ example: 'video.mp4' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 12345678 })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 'Perfect Office Alignment' })
  @IsString()
  @IsNotEmpty()
  @MaxWords(120)
  title: string;

  @ApiProperty({ example: 'Align your desk East/North for wealth... #vastu', required: false })
  @IsString()
  @IsOptional()
  @MaxWords(400)
  caption?: string;

  @ApiProperty({ example: 'office', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'desk_facing', required: false })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ example: 'commercial', required: false })
  @IsString()
  @IsOptional()
  propertyType?: string;

  @ApiProperty({ example: 2500000, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiProperty({ example: 7500000, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({ example: 'Air', required: false })
  @IsString()
  @IsOptional()
  element?: string;

  @ApiProperty({ example: 'Mumbai, India', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'Bandra West', required: false })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '400050', required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ example: 19.0760, required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: 72.8777, required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;
}

export class CompleteUploadDto {
  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  uploadId: string;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Great insight!' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class CommentQueryDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 20, required: false, default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 'uuid', required: false, description: 'Filter replies of a specific parent comment' })
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class GetAllCommentsQueryDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 20, required: false, default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 'vastu', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ example: 'living_room', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'uuid', required: false })
  @IsString()
  @IsOptional()
  reelId?: string;
}


export enum FeedSortBy {
  RECENT = 'recent',
  VIEWS = 'views',
  LIKES = 'likes',
  SAVED = 'saved',
  PRICE_LOW_HIGH = 'price_low_high',
  PRICE_HIGH_LOW = 'price_high_low',
}

export class FeedQueryDto {
  @ApiProperty({ example: 1, required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 10, required: false, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 'office', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'desk_facing', required: false })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ example: 'flat', required: false })
  @IsString()
  @IsOptional()
  propertyType?: string;

  @ApiProperty({ example: 'Air', required: false })
  @IsString()
  @IsOptional()
  element?: string;

  @ApiProperty({ example: 100000, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiProperty({ example: 50000000, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({ example: 4.0, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minRating?: number;

  @ApiProperty({ example: 'uuid', required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: false, required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  liked?: boolean;

  @ApiProperty({ example: false, required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  saved?: boolean;

  @ApiProperty({ example: false, required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  history?: boolean;

  @ApiProperty({ example: false, required: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  commented?: boolean;

  @ApiProperty({ example: 'kitchen vastu north', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: FeedSortBy, example: FeedSortBy.RECENT, required: false })
  @IsEnum(FeedSortBy)
  @IsOptional()
  sortBy?: FeedSortBy;
}

export class UpdateReelDto {
  @ApiProperty({ example: 'Updated Title', required: false })
  @IsString()
  @IsOptional()
  @MaxWords(120)
  title?: string;

  @ApiProperty({ example: 'Updated caption...', required: false })
  @IsString()
  @IsOptional()
  @MaxWords(400)
  caption?: string;

  @ApiProperty({ example: 'kitchen', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'desk_facing', required: false })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiProperty({ example: 'commercial', required: false })
  @IsString()
  @IsOptional()
  propertyType?: string;

  @ApiProperty({ example: 2500000, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiProperty({ example: 7500000, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({ example: 'Air', required: false })
  @IsString()
  @IsOptional()
  element?: string;

  @ApiProperty({ example: 'Mumbai, India', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'Bandra West', required: false })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '400050', required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ example: 'https://images.unsplash.com/...', required: false })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}

