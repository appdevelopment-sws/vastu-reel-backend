import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ description: 'Target user UUID to block or unblock' })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;
}
