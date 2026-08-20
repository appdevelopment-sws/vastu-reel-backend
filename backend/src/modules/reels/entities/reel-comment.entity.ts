import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Reel } from './reel.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reel_comments')
export class ReelComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reel_id' })
  reelId: string;

  @ManyToOne(() => Reel, (reel) => reel.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => ReelComment, (comment) => comment.replies, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ReelComment;

  @OneToMany(() => ReelComment, (comment) => comment.parent)
  replies: ReelComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
