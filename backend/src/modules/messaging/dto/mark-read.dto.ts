import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class MarkReadDto {
  @ApiProperty({ description: 'Last read message UUID' })
  @IsUUID()
  @IsNotEmpty()
  lastReadMessageId: string;
}
