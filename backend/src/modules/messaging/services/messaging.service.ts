import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, Not } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { Message } from '../entities/message.entity';
import { MessageAttachment } from '../entities/message-attachment.entity';
import { MessageReaction } from '../entities/message-reaction.entity';
import { MessageDelivery } from '../entities/message-delivery.entity';
import { UserBlock } from '../entities/user-block.entity';
import { MessageReport } from '../entities/message-report.entity';
import { User } from '../../users/entities/user.entity';
import { ConversationType } from '../enums/conversation-type.enum';
import { MessageType } from '../enums/message-type.enum';
import { SendMessageDto } from '../dto/send-message.dto';
import { GetMessagesQueryDto } from '../dto/get-messages-query.dto';
import { PresenceService } from './presence.service';
import { ReportMessageDto } from '../dto/report-message.dto';
import { MessagingGateway } from '../gateways/messaging.gateway';

import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private readonly participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepo: Repository<MessageAttachment>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepo: Repository<MessageReaction>,
    @InjectRepository(MessageDelivery)
    private readonly deliveryRepo: Repository<MessageDelivery>,
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
    @InjectRepository(MessageReport)
    private readonly reportRepo: Repository<MessageReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly presenceService: PresenceService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => MessagingGateway))
    private readonly messagingGateway: MessagingGateway,
  ) {}

  /**
   * Get or create a 1-on-1 direct conversation with another user.
   */
  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException(
        'Cannot start a conversation with yourself',
      );
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if either user has blocked the other
    const block = await this.blockRepo.findOne({
      where: [
        { blockerId: userId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: userId },
      ],
    });
    if (block) {
      throw new ForbiddenException(
        'Cannot message this user due to block restrictions',
      );
    }

    // Find existing direct conversation between both users
    const existing = await this.conversationRepo
      .createQueryBuilder('c')
      .innerJoin('c.participants', 'p1', 'p1.userId = :userId', { userId })
      .innerJoin('c.participants', 'p2', 'p2.userId = :targetUserId', {
        targetUserId,
      })
      .where('c.type = :type', { type: ConversationType.DIRECT })
      .getOne();

    if (existing) {
      // Un-delete conversation for user if previously deleted
      await this.participantRepo.update(
        { conversationId: existing.id, userId },
        { deletedAt: null as any },
      );
      return this.getConversationDetails(existing.id, userId);
    }

    // Create new conversation in transaction
    const newConv = await this.dataSource.transaction(async (manager) => {
      const conv = manager.create(Conversation, {
        type: ConversationType.DIRECT,
      });
      const savedConv = await manager.save(conv);

      const p1 = manager.create(ConversationParticipant, {
        conversationId: savedConv.id,
        userId,
      });
      const p2 = manager.create(ConversationParticipant, {
        conversationId: savedConv.id,
        userId: targetUserId,
      });

      await manager.save([p1, p2]);
      return savedConv;
    });

    return this.getConversationDetails(newConv.id, userId);
  }

  /**
   * Get conversation details for a specific user.
   */
  async getConversationDetails(conversationId: string, userId: string) {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: {
        participants: {
          user: true,
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const myParticipant = conv.participants.find((p) => p.userId === userId);
    if (!myParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const otherParticipants = conv.participants.filter(
      (p) => p.userId !== userId,
    );
    const otherUser = otherParticipants[0]?.user;

    // Get last message
    let lastMessage: Message | null = null;
    if (conv.lastMessageId) {
      lastMessage = await this.messageRepo.findOne({
        where: { id: conv.lastMessageId },
        relations: {
          sender: true,
          attachments: true,
        },
      });
    }

    // Calculate unread count
    const unreadCount = await this.calculateUnreadCount(
      conversationId,
      userId,
      myParticipant.lastReadMessageId,
    );

    // Presence
    const presence = otherUser
      ? this.presenceService.getPresenceInfo(otherUser.id)
      : { isOnline: false, lastSeen: null };

    return {
      id: conv.id,
      type: conv.type,
      title: conv.title || otherUser?.name || 'Direct Message',
      otherUser: otherUser
        ? {
            id: otherUser.id,
            name: otherUser.name,
            username: otherUser.username,
            avatarUrl: otherUser.avatarUrl,
            profession: otherUser.profession,
            isVerified: otherUser.isVerified,
            isOnline: presence.isOnline,
            lastSeen: presence.lastSeen,
          }
        : null,
      lastMessage: lastMessage ? this.formatMessage(lastMessage, userId) : null,
      lastMessageAt: conv.lastMessageAt || conv.createdAt,
      unreadCount,
      muted: myParticipant.muted,
      archived: myParticipant.archived,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  /**
   * Get all active conversations for a user.
   */
  async getUserConversations(userId: string, search?: string) {
    const participants = await this.participantRepo.find({
      where: { userId },
      relations: {
        conversation: {
          participants: {
            user: true,
          },
        },
      },
      order: { conversation: { updatedAt: 'DESC' } },
    });

    // Filter out deleted conversations for this user
    const activeParticipants = participants.filter((p) => !p.deletedAt);

    const conversations = await Promise.all(
      activeParticipants.map(async (myP) => {
        const conv = myP.conversation;
        const otherP = conv.participants.find((p) => p.userId !== userId);
        const otherUser = otherP?.user;

        // Calculate unread count (if lastReadMessageId equals conversation's lastMessageId, unread is 0)
        let unreadCount = 0;
        if (conv.lastMessageId && myP.lastReadMessageId === conv.lastMessageId) {
          unreadCount = 0;
        } else {
          unreadCount = await this.calculateUnreadCount(
            conv.id,
            userId,
            myP.lastReadMessageId,
          );
        }

        // Presence
        const presence = otherUser
          ? this.presenceService.getPresenceInfo(otherUser.id)
          : { isOnline: false, lastSeen: null };

        let lastMessage: Message | null = null;
        if (conv.lastMessageId) {
          lastMessage = await this.messageRepo.findOne({
            where: { id: conv.lastMessageId },
            relations: {
              sender: true,
              attachments: true,
            },
          });
        }

        return {
          id: conv.id,
          type: conv.type,
          title: conv.title || otherUser?.name || 'Direct Message',
          otherUser: otherUser
            ? {
                id: otherUser.id,
                name: otherUser.name,
                username: otherUser.username,
                avatarUrl: otherUser.avatarUrl,
                profession: otherUser.profession,
                isVerified: otherUser.isVerified,
                isOnline: presence.isOnline,
                lastSeen: presence.lastSeen,
              }
            : null,
          lastMessage: lastMessage
            ? this.formatMessage(lastMessage, userId)
            : null,
          lastMessageAt: conv.lastMessageAt || conv.createdAt,
          unreadCount,
          muted: myP.muted,
          archived: myP.archived,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      }),
    );

    // Apply search filter if query string provided
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      return conversations.filter(
        (c) =>
          c.otherUser?.name?.toLowerCase().includes(q) ||
          c.otherUser?.username?.toLowerCase().includes(q) ||
          c.lastMessage?.content?.toLowerCase().includes(q),
      );
    }

    return conversations;
  }

  /**
   * Get cursor-paginated messages for a conversation.
   */
  async getConversationMessages(
    userId: string,
    conversationId: string,
    query: GetMessagesQueryDto,
  ) {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const limit = query.limit || 30;
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .leftJoinAndSelect('m.replyToMessage', 'replyTo')
      .leftJoinAndSelect('replyTo.sender', 'replySender')
      .leftJoinAndSelect('m.attachments', 'attachments')
      .leftJoinAndSelect('m.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .leftJoinAndSelect('m.deliveries', 'deliveries')
      .where('m.conversationId = :conversationId', { conversationId });

    // If user cleared/deleted conversation earlier, only show messages after that timestamp
    if (participant.deletedAt) {
      qb.andWhere('m.createdAt > :deletedAt', {
        deletedAt: participant.deletedAt,
      });
    }

    // Cursor pagination (createdAt < cursor)
    if (query.cursor) {
      const cursorDate = new Date(query.cursor);
      if (!isNaN(cursorDate.getTime())) {
        qb.andWhere('m.createdAt < :cursorDate', { cursorDate });
      }
    }

    qb.orderBy('m.createdAt', 'DESC').take(limit);

    const messages = await qb.getMany();
    const hasMore = messages.length === limit;
    const nextCursor =
      messages.length > 0
        ? messages[messages.length - 1].createdAt.toISOString()
        : null;

    // Automatically mark conversation as read when opening (first page)
    if (!query.cursor && messages.length > 0) {
      this.markConversationRead(userId, conversationId, messages[0].id).catch(
        () => {},
      );
    }

    return {
      messages: messages.map((m) => this.formatMessage(m, userId)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Send a message in a conversation.
   */
  async sendMessage(userId: string, dto: SendMessageDto) {
    // 1. Verify user is in conversation
    const participant = await this.participantRepo.findOne({
      where: { conversationId: dto.conversationId, userId },
      relations: {
        conversation: {
          participants: true,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Check if target user has blocked sender
    const otherP = participant.conversation.participants.find(
      (p) => p.userId !== userId,
    );
    if (otherP) {
      const block = await this.blockRepo.findOne({
        where: { blockerId: otherP.userId, blockedId: userId },
      });
      if (block) {
        throw new ForbiddenException('Cannot send message to this user');
      }
    }

    // 2. Idempotency check: if clientMessageId provided, prevent duplicates
    if (dto.clientMessageId) {
      const existing = await this.messageRepo.findOne({
        where: {
          conversationId: dto.conversationId,
          clientMessageId: dto.clientMessageId,
        },
        relations: {
          sender: true,
          replyToMessage: {
            sender: true,
          },
          attachments: true,
          reactions: {
            user: true,
          },
          deliveries: true,
        },
      });
      if (existing) {
        return this.formatMessage(existing, userId);
      }
    }

    // 3. Save message and attachments in transaction
    const savedMessage = await this.dataSource.transaction(async (manager) => {
      const message = manager.create(Message, {
        conversationId: dto.conversationId,
        senderId: userId,
        clientMessageId: dto.clientMessageId,
        messageType: dto.messageType || MessageType.TEXT,
        content: dto.content,
        replyToMessageId: dto.replyToMessageId,
        metadata: dto.metadata,
      });

      const saved = await manager.save(message);

      if (dto.attachments && dto.attachments.length > 0) {
        const attachments = dto.attachments.map((att) =>
          manager.create(MessageAttachment, {
            messageId: saved.id,
            storageKey: att.storageKey,
            url: att.url,
            fileType: att.fileType,
            fileName: att.fileName,
            fileSize: att.fileSize,
            thumbnailUrl: att.thumbnailUrl,
          }),
        );
        await manager.save(attachments);
      }

      // Update conversation last message and timestamp
      await manager.update(Conversation, dto.conversationId, {
        lastMessageId: saved.id,
        lastMessageAt: saved.createdAt,
        updatedAt: saved.createdAt,
      });

      // Update sender's last_read_message_id so sender always has 0 unread
      await manager.update(
        ConversationParticipant,
        { conversationId: dto.conversationId, userId },
        { lastReadMessageId: saved.id },
      );

      // Resurface conversation for participants who deleted it previously
      await manager
        .createQueryBuilder()
        .update(ConversationParticipant)
        .set({ deletedAt: null as any })
        .where('conversationId = :conversationId', {
          conversationId: dto.conversationId,
        })
        .execute();

      return saved;
    });

    // 4. Fetch populated message
    const fullMessage = await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: {
        sender: true,
        replyToMessage: {
          sender: true,
        },
        attachments: true,
        reactions: {
          user: true,
        },
        deliveries: true,
      },
    });

    const formatted = this.formatMessage(fullMessage!, userId);

    // Broadcast real-time event to conversation room and other user's inbox
    this.messagingGateway.broadcastNewMessage(
      dto.conversationId,
      formatted,
      userId,
      otherP?.userId,
    );

    // Dispatch background push notification to recipient
    if (otherP?.userId) {
      this.notificationsService
        .sendMessagePush(
          fullMessage?.sender?.name || 'New Message',
          fullMessage?.sender?.avatarUrl,
          otherP.userId,
          fullMessage?.content || 'Sent an attachment',
          dto.conversationId,
          fullMessage?.messageType || 'TEXT',
        )
        .catch(() => {});
    }

    return formatted;
  }

  /**
   * Mark messages in a conversation as read up to a message ID.
   */
  async markConversationRead(
    userId: string,
    conversationId: string,
    lastReadMessageId?: string,
  ) {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    let targetMsg: Message | null = null;
    if (lastReadMessageId) {
      targetMsg = await this.messageRepo.findOne({
        where: { id: lastReadMessageId, conversationId },
      });
    }

    // If no specific message ID provided or not found, use latest message in conversation
    if (!targetMsg) {
      targetMsg = await this.messageRepo.findOne({
        where: { conversationId },
        order: { createdAt: 'DESC' },
      });
    }

    if (!targetMsg) {
      return {
        success: true,
        conversationId,
        unreadCount: 0,
        globalUnreadCount: 0,
      };
    }

    // Update participant last_read_message_id
    await this.participantRepo.update(
      { id: participant.id },
      { lastReadMessageId: targetMsg.id },
    );

    // Update or create delivery read records for received messages
    const unreadMessages = await this.messageRepo.find({
      where: {
        conversationId,
        createdAt: LessThan(new Date(targetMsg.createdAt.getTime() + 1000)),
      },
    });

    const receivedMessages = unreadMessages.filter(
      (m) => m.senderId !== userId,
    );
    for (const msg of receivedMessages) {
      const existingDelivery = await this.deliveryRepo.findOne({
        where: { messageId: msg.id, userId },
      });
      if (existingDelivery) {
        if (!existingDelivery.readAt) {
          await this.deliveryRepo.update(existingDelivery.id, {
            readAt: new Date(),
          });
        }
      } else {
        const delivery = this.deliveryRepo.create({
          messageId: msg.id,
          userId,
          deliveredAt: new Date(),
          readAt: new Date(),
        });
        await this.deliveryRepo.save(delivery);
      }
    }

    const unreadCount = await this.calculateUnreadCount(
      conversationId,
      userId,
      targetMsg.id,
    );
    const globalUnreadCount = await this.getGlobalUnreadCount(userId);

    // Broadcast read receipt to conversation room
    this.messagingGateway.broadcastMessageRead(
      conversationId,
      userId,
      targetMsg.id,
    );

    return {
      success: true,
      conversationId,
      lastReadMessageId: targetMsg.id,
      unreadCount,
      globalUnreadCount,
    };
  }

  /**
   * Toggle or set reaction on a message.
   */
  async reactToMessage(userId: string, messageId: string, reaction: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: {
        conversation: {
          participants: true,
        },
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('You do not have access to this message');
    }

    const existingReaction = await this.reactionRepo.findOne({
      where: { messageId, userId },
    });

    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        // Remove reaction (toggle off)
        await this.reactionRepo.delete(existingReaction.id);
      } else {
        // Change reaction emoji
        await this.reactionRepo.update(existingReaction.id, { reaction });
      }
    } else {
      const newReaction = this.reactionRepo.create({
        messageId,
        userId,
        reaction,
      });
      await this.reactionRepo.save(newReaction);
    }

    const allReactions = await this.reactionRepo.find({
      where: { messageId },
      relations: {
        user: true,
      },
    });

    const result = {
      messageId,
      reactions: allReactions.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.name || 'User',
        reaction: r.reaction,
      })),
    };

    // Broadcast reaction to conversation room
    this.messagingGateway.broadcastReaction(message.conversationId, result);

    return result;
  }

  /**
   * Delete a message (for me or everyone).
   */
  async deleteMessage(
    userId: string,
    messageId: string,
    deleteForEveryone: boolean = false,
  ) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: {
        conversation: {
          participants: true,
        },
      },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('You do not have access to this message');
    }

    if (deleteForEveryone) {
      if (message.senderId !== userId) {
        throw new ForbiddenException(
          'Only the sender can delete a message for everyone',
        );
      }
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = 'This message was deleted';
      message.metadata = null as any;
      await this.messageRepo.save(message);

      // Clean up attachments and reactions for deleted message
      await this.attachmentRepo.delete({ messageId });
      await this.reactionRepo.delete({ messageId });
      message.attachments = [];
      message.reactions = [];

      // Broadcast delete to conversation room
      this.messagingGateway.broadcastMessageDelete(
        message.conversationId,
        messageId,
        true,
      );
    }

    return this.formatMessage(message, userId);
  }

  /**
   * Delete conversation for current user (hides from inbox).
   */
  async deleteConversation(userId: string, conversationId: string) {
    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    await this.participantRepo.update(participant.id, {
      deletedAt: new Date(),
    });

    return { success: true, conversationId };
  }

  /**
   * Block a user.
   */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const existing = await this.blockRepo.findOne({
      where: { blockerId, blockedId },
    });
    if (!existing) {
      const block = this.blockRepo.create({ blockerId, blockedId });
      await this.blockRepo.save(block);
    }
    return { success: true, blockedId };
  }

  /**
   * Unblock a user.
   */
  async unblockUser(blockerId: string, blockedId: string) {
    await this.blockRepo.delete({ blockerId, blockedId });
    return { success: true, unblockedId: blockedId };
  }

  /**
   * Report a message or user.
   */
  async reportMessage(reporterId: string, dto: ReportMessageDto) {
    const report = this.reportRepo.create({
      reporterId,
      reportedUserId: dto.reportedUserId,
      messageId: dto.messageId,
      reason: dto.reason,
      details: dto.details,
    });
    await this.reportRepo.save(report);
    return { success: true, reportId: report.id };
  }

  /**
   * Get global unread message count across all conversations.
   */
  async getGlobalUnreadCount(userId: string): Promise<number> {
    const participants = await this.participantRepo.find({
      where: { userId },
    });

    const activeParticipants = participants.filter((p) => !p.deletedAt);
    let totalUnread = 0;

    for (const p of activeParticipants) {
      const count = await this.calculateUnreadCount(
        p.conversationId,
        userId,
        p.lastReadMessageId,
      );
      totalUnread += count;
    }

    return totalUnread;
  }

  /**
   * Helper: Calculate unread messages in a conversation.
   */
  private async calculateUnreadCount(
    conversationId: string,
    userId: string,
    lastReadMessageId?: string,
  ): Promise<number> {
    if (!lastReadMessageId) {
      return this.messageRepo.count({
        where: {
          conversationId,
          senderId: Not(userId),
        },
      });
    }

    const lastReadMsg = await this.messageRepo.findOne({
      where: { id: lastReadMessageId },
    });
    if (!lastReadMsg) {
      return 0;
    }

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.conversationId = :conversationId', { conversationId })
      .andWhere('m.senderId != :userId', { userId })
      .andWhere('m.id != :lastReadId', { lastReadId: lastReadMsg.id })
      .andWhere('m.createdAt > :lastReadDate', {
        lastReadDate: lastReadMsg.createdAt,
      });

    return qb.getCount();
  }

  /**
   * Helper: Format message entity into consistent client payload.
   */
  private formatMessage(m: Message, currentUserId: string) {
    const isMine = m.senderId === currentUserId;

    // Delivery state
    let deliveryStatus = 'SENT';
    if (m.deliveries && m.deliveries.length > 0) {
      const hasRead = m.deliveries.some((d) => d.readAt != null);
      const hasDelivered = m.deliveries.some((d) => d.deliveredAt != null);
      if (hasRead) deliveryStatus = 'READ';
      else if (hasDelivered) deliveryStatus = 'DELIVERED';
    }

    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      clientMessageId: m.clientMessageId,
      messageType: m.messageType,
      content: m.isDeleted ? 'This message was deleted' : m.content,
      isDeleted: m.isDeleted,
      sender: m.sender
        ? {
            id: m.sender.id,
            name: m.sender.name,
            username: m.sender.username,
            avatarUrl: m.sender.avatarUrl,
          }
        : null,
      replyToMessage: m.replyToMessage
        ? {
            id: m.replyToMessage.id,
            senderId: m.replyToMessage.senderId,
            senderName: m.replyToMessage.sender?.name || 'User',
            content: m.replyToMessage.isDeleted
              ? 'This message was deleted'
              : m.replyToMessage.content,
            messageType: m.replyToMessage.messageType,
          }
        : null,
      metadata: m.isDeleted ? null : m.metadata,
      attachments: m.isDeleted
        ? []
        : (m.attachments || []).map((a) => ({
            id: a.id,
            storageKey: a.storageKey,
            url: a.url,
            fileType: a.fileType,
            fileName: a.fileName,
            fileSize: Number(a.fileSize),
            thumbnailUrl: a.thumbnailUrl,
          })),
      reactions: m.isDeleted
        ? []
        : (m.reactions || []).map((r) => ({
            id: r.id,
            userId: r.userId,
            userName: r.user?.name || 'User',
            reaction: r.reaction,
          })),
      status: deliveryStatus,
      isMine,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
