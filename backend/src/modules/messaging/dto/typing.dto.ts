import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TypingDto {
  @ApiProperty({ description: 'Conversation UUID' })
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;
}
