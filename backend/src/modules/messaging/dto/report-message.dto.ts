import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ReportReason } from '../enums/delivery-status.enum';

export class ReportMessageDto {
  @ApiProperty({ description: 'Reported user UUID' })
  @IsUUID()
  @IsNotEmpty()
  reportedUserId: string;

  @ApiPropertyOptional({ description: 'Specific message UUID being reported' })
  @IsUUID()
  @IsOptional()
  messageId?: string;

  @ApiProperty({
    enum: ReportReason,
    default: ReportReason.OTHER,
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiPropertyOptional({ description: 'Additional details or evidence' })
  @IsString()
  @IsOptional()
  details?: string;
}
