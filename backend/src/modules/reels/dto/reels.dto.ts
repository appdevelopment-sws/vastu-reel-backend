import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
  title: string;

  @ApiProperty({ example: 'Align your desk East/North for wealth... #vastu', required: false })
  @IsString()
  @IsOptional()
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

  @ApiProperty({ example: 'Air', required: false })
  @IsString()
  @IsOptional()
  element?: string;

  @ApiProperty({ example: 'Mumbai, India', required: false })
  @IsString()
  @IsOptional()
  location?: string;
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

  @ApiProperty({ example: 'Air', required: false })
  @IsString()
  @IsOptional()
  element?: string;

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
}
