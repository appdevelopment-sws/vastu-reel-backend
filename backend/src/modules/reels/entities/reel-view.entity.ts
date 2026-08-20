import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Reel } from './reel.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reel_views')
export class ReelView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reel_id' })
  reelId: string;

  @ManyToOne(() => Reel, (reel) => reel.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
