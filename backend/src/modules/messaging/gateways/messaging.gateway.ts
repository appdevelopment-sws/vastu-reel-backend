import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from '../services/messaging.service';
import { PresenceService } from '../services/presence.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { ReactMessageDto } from '../dto/react-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagingService: MessagingService,
    private readonly presenceService: PresenceService,
  ) {}

  afterInit() {
    this.logger.log('🚀 Messaging Socket.IO Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `Connection rejected: Missing token on socket ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const userId = payload.sub;

      client.data.user = payload;
      client.data.userId = userId;

      // Join user specific room for targeted notifications/events
      client.join(`user_${userId}`);

      // Track presence
      const isFirstConnection = this.presenceService.userConnected(
        userId,
        client.id,
      );

      if (isFirstConnection) {
        // Broadcast presence online to everyone
        this.server.emit('presence:status', {
          userId,
          isOnline: true,
          lastSeen: null,
        });
      }

      this.logger.log(
        `User ${userId} (${payload.name}) connected on socket ${client.id}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Authentication failed on socket ${client.id}: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const { userId, isNowOffline } = this.presenceService.userDisconnected(
      client.id,
    );

    if (userId && isNowOffline) {
      const lastSeen = this.presenceService.getLastSeen(userId);
      this.server.emit('presence:status', {
        userId,
        isOnline: false,
        lastSeen,
      });
      this.logger.log(`User ${userId} disconnected all sockets (now offline)`);
    }
  }

  /**
   * Client joins conversation room.
   */
  @SubscribeMessage('conversation:join')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.join(`conversation_${data.conversationId}`);
      this.logger.debug(
        `Socket ${client.id} joined conversation_${data.conversationId}`,
      );
      return { status: 'joined', conversationId: data.conversationId };
    }
  }

  /**
   * Client leaves conversation room.
   */
  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conversation_${data.conversationId}`);
      return { status: 'left', conversationId: data.conversationId };
    }
  }

  /**
   * Send real-time message.
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data.userId;
    if (!userId) return { error: 'Unauthorized' };

    try {
      const message = await this.messagingService.sendMessage(userId, dto);

      // Broadcast to all sockets in conversation room
      this.server
        .to(`conversation_${dto.conversationId}`)
        .emit('message:new', message);

      // Also notify participants' personal rooms for inbox refresh
      const details = await this.messagingService.getConversationDetails(
        dto.conversationId,
        userId,
      );

      if (details.otherUser) {
        this.server
          .to(`user_${details.otherUser.id}`)
          .emit('conversation:update', {
            conversationId: dto.conversationId,
            lastMessage: message,
            senderId: userId,
          });
      }

      // Acknowledge back to sender
      return { status: 'success', message };
    } catch (err: any) {
      this.logger.error(`Error sending message: ${err.message}`);
      return { status: 'error', message: err.message };
    }
  }

  /**
   * Mark messages as read.
   */
  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; lastReadMessageId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const result = await this.messagingService.markConversationRead(
        userId,
        data.conversationId,
        data.lastReadMessageId,
      );

      // Broadcast read receipt to conversation room
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message:read', {
          conversationId: data.conversationId,
          readerId: userId,
          lastReadMessageId: data.lastReadMessageId,
        });

      return result;
    } catch (err: any) {
      this.logger.error(`Error marking read: ${err.message}`);
    }
  }

  /**
   * Typing start.
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    const user = client.data.user;
    if (!userId || !data?.conversationId) return;

    client.to(`conversation_${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId,
      userName: user?.name || 'Someone',
    });
  }

  /**
   * Typing stop.
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.conversationId) return;

    client.to(`conversation_${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId,
    });
  }

  /**
   * Message reaction.
   */
  @SubscribeMessage('message:reaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; messageId: string; reaction: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.messageId || !data?.reaction) return;

    try {
      const result = await this.messagingService.reactToMessage(
        userId,
        data.messageId,
        data.reaction,
      );

      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message:reaction', {
          conversationId: data.conversationId,
          ...result,
        });

      return result;
    } catch (err: any) {
      this.logger.error(`Error reacting: ${err.message}`);
    }
  }

  /**
   * Query presence for multiple users.
   */
  @SubscribeMessage('presence:query')
  handlePresenceQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userIds: string[] },
  ) {
    if (!data?.userIds || !Array.isArray(data.userIds)) return [];

    return data.userIds.map((uid) => ({
      userId: uid,
      ...this.presenceService.getPresenceInfo(uid),
    }));
  }

  private extractToken(client: Socket): string | null {
    const authHeader =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.query?.token;

    if (!authHeader) return null;

    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return authHeader;
    }

    return null;
  }
}
