import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../enums/message-type.enum';

export class MessageAttachmentInputDto {
  @ApiProperty({ description: 'Storage key in S3 or local path' })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiProperty({ description: 'Direct or signed URL to download attachment' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'MIME type of file', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiPropertyOptional({ description: 'Original file name' })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiProperty({
    description: 'File size in bytes (max 100MB = 104,857,600 bytes)',
  })
  @IsNumber()
  @Max(104857600, { message: 'File size cannot exceed 100MB' })
  fileSize: number;

  @ApiPropertyOptional({ description: 'Thumbnail URL if video or image' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation UUID' })
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @ApiPropertyOptional({
    description: 'Unique client-generated idempotency key to prevent duplicates',
  })
  @IsString()
  @IsOptional()
  clientMessageId?: string;

  @ApiPropertyOptional({
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @ApiPropertyOptional({ description: 'Text / encrypted content of message' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Replying to message UUID' })
  @IsUUID()
  @IsOptional()
  replyToMessageId?: string;

  @ApiPropertyOptional({
    description:
      'Property / Reel metadata or rich preview details for real estate cards',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: [MessageAttachmentInputDto],
    description: 'List of media / document attachments',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentInputDto)
  attachments?: MessageAttachmentInputDto[];
}
