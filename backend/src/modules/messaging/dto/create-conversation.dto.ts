import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Target User UUID to start a conversation with',
    example: 'd3b07384-d113-4607-b3fa-09439f00e998',
  })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;
}
