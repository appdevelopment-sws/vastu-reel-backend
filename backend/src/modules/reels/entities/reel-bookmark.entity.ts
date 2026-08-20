import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Reel } from './reel.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reel_bookmarks')
@Unique(['reelId', 'userId'])
export class ReelBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reel_id' })
  reelId: string;

  @ManyToOne(() => Reel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
