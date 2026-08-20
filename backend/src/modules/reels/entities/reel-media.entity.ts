import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Reel } from './reel.entity';

@Entity('reel_media')
export class ReelMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reel_id' })
  reelId: string;

  @OneToOne(() => Reel, (reel) => reel.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reel_id' })
  reel: Reel;

  @Column({ name: 'original_key' })
  originalKey: string;

  @Column({ name: 'hls_key', nullable: true })
  hlsKey: string;

  @Column({ name: 'thumbnail_key', nullable: true })
  thumbnailKey: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  duration: number;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
