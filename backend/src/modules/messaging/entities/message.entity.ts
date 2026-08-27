import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { MessageType } from '../enums/message-type.enum';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';
import { MessageAttachment } from './message-attachment.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageDelivery } from './message-delivery.entity';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
@Index(['clientMessageId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'sender_id' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'client_message_id', nullable: true })
  clientMessageId?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: 'longtext', nullable: true })
  content?: string;

  @Column({ name: 'reply_to_message_id', nullable: true })
  replyToMessageId?: string;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyToMessage?: Message;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => MessageAttachment, (a) => a.message, { cascade: true })
  attachments: MessageAttachment[];

  @OneToMany(() => MessageReaction, (r) => r.message, { cascade: true })
  reactions: MessageReaction[];

  @OneToMany(() => MessageDelivery, (d) => d.message, { cascade: true })
  deliveries: MessageDelivery[];

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
