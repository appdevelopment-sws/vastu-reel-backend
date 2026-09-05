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
import { SubCategory } from '../../categories/entities/sub-category.entity';

@Entity('property_types')
export class PropertyType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'sub_category_id', type: 'varchar', length: 36, nullable: true })
  subCategoryId?: string | null;

  @ManyToOne(() => SubCategory, (sub) => sub.propertyTypes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'sub_category_id' })
  subCategory?: SubCategory | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon?: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Index()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
