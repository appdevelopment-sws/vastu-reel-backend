import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FeedbackType {
  GENERAL = 'GENERAL',
  SUGGESTION = 'SUGGESTION',
  BUG_REPORT = 'BUG_REPORT',
  IMPROVEMENT = 'IMPROVEMENT',
}

export enum FeedbackStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36, nullable: true })
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.SUGGESTION,
  })
  type: FeedbackType;

  @Column({ type: 'text' })
  content: string;

  @Index()
  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceInfo?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contactEmail?: string;

  @Column({ type: 'text', nullable: true })
  adminNotes?: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
