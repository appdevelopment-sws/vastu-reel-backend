import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreatePropertyTypeDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the parent subcategory this type belongs to',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  subCategoryId?: string;

  @ApiProperty({ example: 'Residential' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'residential' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'home_outlined', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({
    example: 'Residential properties like apartments, villas, and houses',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1, required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePropertyTypeDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the parent subcategory this type belongs to',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  subCategoryId?: string;

  @ApiProperty({ example: 'Residential', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'residential', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'home_outlined', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({
    example: 'Residential properties like apartments, villas, and houses',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class PropertyTypeResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
  subCategoryId?: string | null;

  @ApiProperty({ example: { id: 'uuid', name: 'Flat', slug: 'flat' }, nullable: true })
  subCategory?: any;

  @ApiProperty({ example: 'Residential' })
  name: string;

  @ApiProperty({ example: 'residential' })
  slug: string;

  @ApiProperty({ example: 'home_outlined', nullable: true })
  icon: string | null;

  @ApiProperty({ example: 'Residential properties', nullable: true })
  description: string | null;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0, required: false })
  reelsCount?: number;

  @ApiProperty({ example: '2026-09-02T11:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-02T11:00:00.000Z' })
  updatedAt: Date;
}
