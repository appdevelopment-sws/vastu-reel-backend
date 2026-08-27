import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
import { DeviceToken } from '../entities/device-token.entity';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { SendBroadcastNotificationDto } from '../dto/send-broadcast-notification.dto';
import { NotificationType } from '../enums/notification-type.enum';

export interface SendPushPayload {
  targetUserIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  imageUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private isFirebaseInitialized = false;
  private firebaseApp?: App;

  constructor(
    @InjectRepository(DeviceToken)
    private readonly tokenRepo: Repository<DeviceToken>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  /**
   * Initializes Firebase Admin SDK with graceful fallback if credentials are not yet added.
   */
  private initializeFirebase() {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.firebaseApp = existingApps[0];
      this.isFirebaseInitialized = true;
      return;
    }

    try {
      const serviceAccountPath = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );
      const serviceAccountJson = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_JSON',
      );
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      let credential: any = null;

      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const resolvedPath = path.resolve(serviceAccountPath);
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        credential = cert(JSON.parse(fileContent));
        this.logger.log(`Firebase credentials loaded from file: ${resolvedPath}`);
      } else if (serviceAccountJson) {
        credential = cert(JSON.parse(serviceAccountJson));
        this.logger.log('Firebase credentials loaded from JSON string.');
      } else if (projectId && clientEmail && privateKey) {
        credential = cert({
          projectId,
          clientEmail,
          privateKey,
        });
        this.logger.log('Firebase credentials loaded from environment variables.');
      }

      if (credential) {
        this.firebaseApp = initializeApp({
          credential,
        });
        this.isFirebaseInitialized = true;
        this.logger.log('🚀 Firebase Cloud Messaging (FCM) initialized successfully.');
      } else {
        this.logger.warn(
          '⚠️ Firebase credentials not configured. Push notifications will run in SIMULATION mode.',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize Firebase Admin SDK. Push notifications running in simulation mode:',
        error,
      );
      this.isFirebaseInitialized = false;
    }
  }

  /**
   * Registers or updates a client device FCM token for a user.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<DeviceToken> {
    let tokenRecord = await this.tokenRepo.findOne({
      where: { token: dto.token },
    });

    if (tokenRecord) {
      tokenRecord.userId = userId;
      tokenRecord.platform = dto.platform;
      tokenRecord.deviceId = dto.deviceId || tokenRecord.deviceId;
      tokenRecord.isActive = true;
      tokenRecord.lastUsedAt = new Date();
    } else {
      tokenRecord = this.tokenRepo.create({
        userId,
        token: dto.token,
        platform: dto.platform,
        deviceId: dto.deviceId,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    return this.tokenRepo.save(tokenRecord);
  }

  /**
   * Unregisters a device token (e.g. on user logout).
   */
  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.tokenRepo.delete({ userId, token });
  }

  /**
   * Prune invalid or expired FCM tokens returned from Firebase errors.
   */
  async pruneInvalidTokens(tokens: string[]): Promise<void> {
    if (!tokens || tokens.length === 0) return;
    try {
      await this.tokenRepo.delete({ token: In(tokens) });
      this.logger.log(`Pruned ${tokens.length} invalid/expired FCM tokens.`);
    } catch (err) {
      this.logger.warn('Error pruning invalid tokens:', err);
    }
  }

  /**
   * Core Push Dispatcher: sends multicast notifications to one or more user IDs.
   */
  async sendPushNotification(payload: SendPushPayload): Promise<{
    successCount: number;
    failureCount: number;
  }> {
    const { targetUserIds, title, body, type, data = {}, imageUrl } = payload;

    if (!targetUserIds || targetUserIds.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    // Retrieve active device tokens for the target users
    const deviceTokens = await this.tokenRepo.find({
      where: {
        userId: In(targetUserIds),
        isActive: true,
      },
    });

    if (deviceTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = deviceTokens.map((d) => d.token);

    // Prepare FCM string data payload (FCM requires string key-values)
    const stringData: Record<string, string> = {
      type: type.toString(),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        stringData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    if (!this.isFirebaseInitialized || !this.firebaseApp) {
      this.logger.debug(
        `[SIMULATED PUSH] To ${tokens.length} devices for users [${targetUserIds.join(', ')}] | Title: "${title}" | Body: "${body}" | Type: ${type}`,
      );
      return { successCount: tokens.length, failureCount: 0 };
    }

    const messaging = getMessaging(this.firebaseApp);
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);

      const message: MulticastMessage = {
        tokens: chunk,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'vastu_high_importance_channel',
            priority: 'high',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
          fcmOptions: imageUrl ? { imageUrl } : undefined,
        },
      };

      try {
        const response = await messaging.sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errCode = resp.error.code;
            if (
              errCode === 'messaging/registration-token-not-registered' ||
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/mismatched-credential'
            ) {
              invalidTokens.push(chunk[idx]);
            }
          }
        });
      } catch (sendErr) {
        this.logger.error('Error dispatching multicast push batch:', sendErr);
        failureCount += chunk.length;
      }
    }

    // Clean up stale tokens asynchronously
    if (invalidTokens.length > 0) {
      this.pruneInvalidTokens(invalidTokens).catch(() => {});
    }

    return { successCount, failureCount };
  }

  /**
   * Broadcast push notification to ALL registered active user devices (Admin Panel support).
   */
  async sendBroadcastNotification(
    dto: SendBroadcastNotificationDto,
  ): Promise<{ successCount: number; failureCount: number; totalRecipients: number }> {
    const allActiveTokens = await this.tokenRepo.find({
      where: { isActive: true },
      select: { token: true },
    });

    if (allActiveTokens.length === 0) {
      return { successCount: 0, failureCount: 0, totalRecipients: 0 };
    }

    const tokens = allActiveTokens.map((t) => t.token);

    const stringData: Record<string, string> = {
      type: (dto.type || NotificationType.BROADCAST).toString(),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    };
    if (dto.data) {
      for (const [key, value] of Object.entries(dto.data)) {
        if (value !== undefined && value !== null) {
          stringData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      }
    }

    if (!this.isFirebaseInitialized || !this.firebaseApp) {
      this.logger.debug(
        `[SIMULATED BROADCAST] To ${tokens.length} devices | Title: "${dto.title}" | Body: "${dto.body}"`,
      );
      return {
        successCount: tokens.length,
        failureCount: 0,
        totalRecipients: tokens.length,
      };
    }

    const messaging = getMessaging(this.firebaseApp);
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);

      const message: MulticastMessage = {
        tokens: chunk,
        notification: {
          title: dto.title,
          body: dto.body,
          ...(dto.imageUrl ? { imageUrl: dto.imageUrl } : {}),
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'vastu_high_importance_channel',
            priority: 'high',
            ...(dto.imageUrl ? { imageUrl: dto.imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
          fcmOptions: dto.imageUrl ? { imageUrl: dto.imageUrl } : undefined,
        },
      };

      try {
        const response = await messaging.sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errCode = resp.error.code;
            if (
              errCode === 'messaging/registration-token-not-registered' ||
              errCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(chunk[idx]);
            }
          }
        });
      } catch (err) {
        this.logger.error('Error sending broadcast push batch:', err);
        failureCount += chunk.length;
      }
    }

    if (invalidTokens.length > 0) {
      this.pruneInvalidTokens(invalidTokens).catch(() => {});
    }

    return {
      successCount,
      failureCount,
      totalRecipients: tokens.length,
    };
  }

  /**
   * Helper: Dispatch push notification for incoming direct messages.
   */
  async sendMessagePush(
    senderName: string,
    senderAvatar: string | undefined,
    recipientId: string,
    messageContent: string,
    conversationId: string,
    messageType: string,
    attachmentImageUrl?: string,
  ) {
    let bodyPreview = messageContent;
    if (messageType === 'IMAGE') bodyPreview = '📷 Sent a photo';
    else if (messageType === 'VIDEO') bodyPreview = '🎥 Sent a video';
    else if (messageType === 'FILE') bodyPreview = '📁 Sent an attachment';
    else if (messageType === 'REEL') bodyPreview = '🎬 Shared a reel';
    else if (messageType === 'PROPERTY') bodyPreview = '🏠 Shared a property';

    return this.sendPushNotification({
      targetUserIds: [recipientId],
      title: senderName || 'New Message',
      body: bodyPreview,
      type: NotificationType.MESSAGE,
      imageUrl: attachmentImageUrl,
      data: {
        conversationId,
        senderName,
        senderAvatar: senderAvatar || '',
        messageType,
      },
    }).catch((err) => {
      this.logger.warn('Failed to send message push notification:', err);
    });
  }

  /**
   * Helper: Dispatch push notification for social activity (likes, comments, follows).
   */
  async sendActivityPush(
    actorName: string,
    targetUserId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: Record<string, any> = {},
  ) {
    return this.sendPushNotification({
      targetUserIds: [targetUserId],
      title,
      body,
      type,
      data,
    }).catch((err) => {
      this.logger.warn('Failed to send activity push notification:', err);
    });
  }
}
