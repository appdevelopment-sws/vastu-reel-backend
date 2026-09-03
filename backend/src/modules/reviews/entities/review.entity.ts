import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('reviews')
@Unique(['reviewerId', 'targetUserId'])
@Index(['targetUserId', 'status'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  @Index()
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ name: 'target_user_id', type: 'uuid' })
  @Index()
  targetUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ name: 'property_details', nullable: true, length: 255 })
  propertyDetails?: string;

  @Column({ name: 'experience_tag', nullable: true, length: 100 })
  experienceTag?: string;

  @Column({ name: 'reviewer_name', nullable: true, length: 150 })
  reviewerName?: string;

  @Column({ name: 'reviewer_email', nullable: true, length: 150 })
  reviewerEmail?: string;

  @Column({ name: 'reviewer_phone', nullable: true, length: 50 })
  reviewerPhone?: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
