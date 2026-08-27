import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class SendBroadcastNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Special Announcement',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification body message',
    example: 'Check out the new featured properties and vastu tips for this week!',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Notification type category',
    enum: NotificationType,
    default: NotificationType.BROADCAST,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Optional image/banner URL to show in expanded push notification',
    example: 'https://example.com/banner.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom key-value payload for deep-linking',
    example: { reelId: 'uuid', route: '/home' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
