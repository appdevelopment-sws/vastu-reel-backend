import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReelReportStatus } from '../entities/reel-report.entity';

export class CreateReelReportDto {
  @ApiProperty({
    example: 'Spam / Scam',
    description: 'The core reason for reporting the reel',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: 'This video promotes an unauthorized fraudulent investment scheme.',
    description: 'Optional additional context or explanation',
  })
  @IsString()
  @IsOptional()
  details?: string;
}

export class GetReelReportsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ReelReportStatus })
  @IsOptional()
  @IsEnum(ReelReportStatus)
  status?: ReelReportStatus;

  @ApiPropertyOptional({ description: 'Search by reel title, reporter name, or reason' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReelReportStatus, example: ReelReportStatus.RESOLVED })
  @IsEnum(ReelReportStatus)
  @IsNotEmpty()
  status: ReelReportStatus;

  @ApiPropertyOptional({ example: 'Reel was reviewed and deemed to violate community guidelines.' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
