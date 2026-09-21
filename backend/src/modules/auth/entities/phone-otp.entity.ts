import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('phone_otps')
@Index(['phone', 'isUsed'])
export class PhoneOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ length: 20 })
  phone: string;

  @Column({ length: 6 })
  otp: string;

  @Column({ length: 255, nullable: true })
  sessionId?: string;

  @Index()
  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
