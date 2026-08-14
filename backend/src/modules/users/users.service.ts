import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface FormattedPassengerUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  address?: string;
  emergencyContact?: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  totalTripsCount: number;
  walletBalance: number;
  roles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Helper to format user entity into passenger user response format
   */
  private formatUser(user: User, bookingCount = 0): FormattedPassengerUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      age: user.age || undefined,
      address: user.address || undefined,
      emergencyContact: user.emergencyContact || undefined,
      isActive: user.isActive,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      totalTripsCount: Number(bookingCount || 0),
      walletBalance: 0.0,
      roles: user.roles ? user.roles.map((r) => r.name) : [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create a new passenger user account
   */
  async create(createUserDto: CreateUserDto): Promise<FormattedPassengerUser> {
    const emailNormalized = createUserDto.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });
    if (existing) {
      throw new ConflictException(
        `Email address '${emailNormalized}' is already registered.`,
      );
    }

    const targetRoleName = createUserDto.roleName || 'USER';
    let role = await this.roleRepository.findOne({
      where: { name: targetRoleName },
    });

    if (!role) {
      role = this.roleRepository.create({
        name: targetRoleName,
        description: `${targetRoleName} role`,
      });
      await this.roleRepository.save(role);
    }

    const plainPassword = createUserDto.password || 'Password123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = this.userRepository.create({
      name: createUserDto.name.trim(),
      email: emailNormalized,
      phone: createUserDto.phone ? createUserDto.phone.trim() : undefined,
      age: createUserDto.age,
      address: createUserDto.address ? createUserDto.address.trim() : undefined,
      emergencyContact: createUserDto.emergencyContact
        ? createUserDto.emergencyContact.trim()
        : undefined,
      password: hashedPassword,
      isActive:
        createUserDto.isActive !== undefined ? createUserDto.isActive : true,
      roles: [role],
    });

    const savedUser = await this.userRepository.save(user);
    return this.formatUser(savedUser, 0);
  }

  /**
   * Delete or deactivate passenger user by ID
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    await this.userRepository.remove(user);
    return {
      success: true,
      message: `User '${user.name}' has been successfully deleted.`,
    };
  }
}
