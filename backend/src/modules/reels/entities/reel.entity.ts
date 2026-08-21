import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReelMedia } from './reel-media.entity';
import { ReelLike } from './reel-like.entity';
import { ReelBookmark } from './reel-bookmark.entity';
import { ReelComment } from './reel-comment.entity';
import { ReelView } from './reel-view.entity';

export enum ReelStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum ReelVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  UNLISTED = 'UNLISTED',
}

@Entity('reels')
export class Reel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'sub_category', nullable: true })
  subCategory: string;

  @Column({ name: 'property_type', nullable: true })
  propertyType: string;

  @Column({ nullable: true })
  element: string;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ReelStatus.UPLOADING,
  })
  status: ReelStatus;

  @Column({
    type: 'varchar',
    length: 50,
    default: ReelVisibility.PUBLIC,
  })
  visibility: ReelVisibility;

  @Column({ name: 'scheduled_time', nullable: true })
  scheduledTime: Date;

  @Column({ name: 'share_to_whatsapp', default: false })
  shareToWhatsApp: boolean;

  @Column({ name: 'share_to_facebook', default: false })
  shareToFacebook: boolean;

  @Column({ name: 'share_to_instagram', default: false })
  shareToInstagram: boolean;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @OneToOne(() => ReelMedia, (media) => media.reel, { cascade: true })
  media: ReelMedia;

  @OneToMany(() => ReelLike, (like) => like.reel)
  likes: ReelLike[];

  @OneToMany(() => ReelBookmark, (bookmark) => bookmark.reel)
  bookmarks: ReelBookmark[];

  @OneToMany(() => ReelComment, (comment) => comment.reel)
  comments: ReelComment[];

  @OneToMany(() => ReelView, (view) => view.reel)
  views: ReelView[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
