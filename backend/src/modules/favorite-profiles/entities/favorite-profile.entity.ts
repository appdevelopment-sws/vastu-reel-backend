import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('favorite_profiles')
@Unique(['userId', 'favoriteProfileId'])
@Index(['userId', 'createdAt'])
export class FavoriteProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'favorite_profile_id', type: 'uuid' })
  @Index()
  favoriteProfileId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'favorite_profile_id' })
  favoriteProfile: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
