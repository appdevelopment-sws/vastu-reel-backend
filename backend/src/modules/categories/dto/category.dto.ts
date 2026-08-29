import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Living Room' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'living_room' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'weekend_outlined', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 1, required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class CreateSubCategoryDto {
  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Flat / Apartment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'flat' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 1, required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class SubCategoryResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Flat' })
  name: string;

  @ApiProperty({ example: 'flat' })
  slug: string;

  @ApiProperty({ example: 1 })
  order: number;
}

export class CategoryResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Living Room' })
  name: string;

  @ApiProperty({ example: 'living_room' })
  slug: string;

  @ApiProperty({ example: 'weekend_outlined', nullable: true })
  icon: string | null;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ type: [SubCategoryResponseDto] })
  subCategories: SubCategoryResponseDto[];
}
