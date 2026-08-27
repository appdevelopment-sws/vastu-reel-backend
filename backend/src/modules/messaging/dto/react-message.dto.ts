import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReactMessageDto {
  @ApiProperty({ description: 'Emoji reaction character', example: '👍' })
  @IsString()
  @IsNotEmpty()
  reaction: string;
}
