import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './services/notifications.service';
import {
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from './dto/register-device.dto';
import { SendBroadcastNotificationDto } from './dto/send-broadcast-notification.dto';
import { NotificationType } from './enums/notification-type.enum';

@ApiTags('Push Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register or refresh FCM device push token for authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Device token registered successfully',
  })
  async registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    const userId = req.user.sub;
    const record = await this.notificationsService.registerDevice(userId, dto);
    return {
      success: true,
      message: 'Device token registered successfully',
      deviceId: record.id,
    };
  }

  @Delete('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister device token on logout',
  })
  async unregisterDevice(@Req() req: any, @Body() dto: UnregisterDeviceDto) {
    const userId = req.user.sub;
    await this.notificationsService.unregisterDevice(userId, dto.token);
    return {
      success: true,
      message: 'Device token unregistered successfully',
    };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a test push notification to the authenticated user',
  })
  async sendTestNotification(@Req() req: any) {
    const userId = req.user.sub;
    const result = await this.notificationsService.sendPushNotification({
      targetUserIds: [userId],
      title: 'Vastu Reel Test Notification 🚀',
      body: 'Your push notification system is working perfectly!',
      type: NotificationType.SYSTEM,
      data: {
        test: 'true',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      result,
    };
  }

  @Post('broadcast')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send broadcast push notification to all active devices (Admin Panel)',
  })
  async sendBroadcast(@Body() dto: SendBroadcastNotificationDto) {
    const result = await this.notificationsService.sendBroadcastNotification(dto);
    return {
      success: true,
      message: `Broadcast dispatched to ${result.totalRecipients} devices`,
      stats: result,
    };
  }
}
