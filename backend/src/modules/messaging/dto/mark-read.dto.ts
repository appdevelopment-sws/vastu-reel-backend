import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MarkReadDto {
  @ApiProperty({ description: 'Last read message UUID (optional; defaults to latest message)', required: false })
  @IsOptional()
  @IsUUID()
  lastReadMessageId?: string;
}
