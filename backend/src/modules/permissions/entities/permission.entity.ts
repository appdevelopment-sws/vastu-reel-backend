import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g. "buses:manage", "bookings:read"

  @Column({ nullable: true })
  resource: string; // e.g. "buses", "bookings", "users"

  @Column({ nullable: true })
  action: string; // e.g. "create", "read", "update", "delete", "manage"

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
