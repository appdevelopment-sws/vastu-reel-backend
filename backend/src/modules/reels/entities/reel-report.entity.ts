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
import { Reel } from './reel.entity';

export enum ReelReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Entity('reel_reports')
@Index(['reelId', 'status'])
@Index(['reelId'])
@Index(['reporterId'])
export class ReelReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reel_id' })
  reelId: string;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;

  @Column({ name: 'reporter_id' })
  reporterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({ length: 150 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details?: string | null;

  @Column({
    type: 'enum',
    enum: ReelReportStatus,
    default: ReelReportStatus.PENDING,
  })
  status: ReelReportStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string | null;

  @Column({ name: 'reviewed_by_id', nullable: true })
  reviewedById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
