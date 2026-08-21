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
import { Reel } from '../../reels/entities/reel.entity';

export enum ActivityLogType {
  LIKE = 'like',
  COMMENT = 'comment',
  MENTION = 'mention',
  FOLLOW = 'follow',
  REEL_PUBLISHED = 'reel_published',
  SYSTEM = 'system',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ActivityLogType.SYSTEM,
  })
  type: ActivityLogType;

  /**
   * The user who performed the action (nullable for system events).
   */
  @Column({ name: 'actor_id', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  /**
   * The user who receives this notification in their activity feed.
   * Null when isGlobal = true (global events don't target a specific user).
   */
  @Column({ name: 'target_user_id', nullable: true })
  @Index()
  targetUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User;

  /**
   * Optional reference to the reel this activity is about.
   */
  @Column({ name: 'reel_id', nullable: true })
  reelId: string | null;

  @ManyToOne(() => Reel, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;

  /**
   * Human-readable message describing the activity.
   */
  @Column({ type: 'text' })
  message: string;

  /**
   * If true, this activity is visible to ALL users in the global feed.
   * If false, only the targetUser can see it.
   */
  @Column({ name: 'is_global', default: false })
  @Index()
  isGlobal: boolean;

  /**
   * Extra context stored as JSON (e.g. reel title, thumbnail, actor name).
   */
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
