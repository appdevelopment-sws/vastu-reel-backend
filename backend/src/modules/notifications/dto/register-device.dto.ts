import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '../enums/device-platform.enum';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging (FCM) device registration token',
    example: 'dK_8xJ2...fcm_token...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Device operating system platform',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiPropertyOptional({
    description: 'Unique client hardware/installation ID',
    example: 'a1b2c3d4-e5f6',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class UnregisterDeviceDto {
  @ApiProperty({
    description: 'FCM device token to unregister',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
