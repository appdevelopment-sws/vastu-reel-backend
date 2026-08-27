import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { MessageAttachment } from './entities/message-attachment.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageDelivery } from './entities/message-delivery.entity';
import { UserBlock } from './entities/user-block.entity';
import { MessageReport } from './entities/message-report.entity';
import { User } from '../users/entities/user.entity';
import { MessagingService } from './services/messaging.service';
import { PresenceService } from './services/presence.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      MessageAttachment,
      MessageReaction,
      MessageDelivery,
      UserBlock,
      MessageReport,
      User,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'vastu_jwt_secret_key_2026'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN', '30d') as any),
        },
      }),
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, PresenceService, MessagingGateway],
  exports: [MessagingService, PresenceService, MessagingGateway],
})
export class MessagingModule {}
