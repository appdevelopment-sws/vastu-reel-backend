import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';
import { ReportReason } from '../enums/delivery-status.enum';

@Entity('message_reports')
@Index(['reporterId'])
@Index(['reportedUserId'])
export class MessageReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id' })
  reporterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ name: 'reported_user_id' })
  reportedUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser: User;

  @Column({ name: 'message_id', nullable: true })
  messageId?: string;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'message_id' })
  message?: Message;

  @Column({
    type: 'varchar',
    length: 50,
    default: ReportReason.OTHER,
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @Column({ default: 'PENDING' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
