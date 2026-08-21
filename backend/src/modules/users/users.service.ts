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

export interface FormattedUserResponse {
  id: string;
  username?: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  address?: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
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
   * Helper to format user entity into API user response format
   */
  private formatUser(user: User): FormattedUserResponse {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      age: user.age || undefined,
      address: user.address || undefined,
      isActive: user.isActive,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      roles: user.roles ? user.roles.map((r) => r.name) : [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Create a new user account
   */
  async create(createUserDto: CreateUserDto): Promise<FormattedUserResponse> {
    const emailNormalized = createUserDto.email.toLowerCase().trim();
    const usernameNormalized = createUserDto.username.toLowerCase().trim();

    const existingEmail = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Email address '${emailNormalized}' is already registered.`,
      );
    }

    const existingUsername = await this.userRepository.findOne({
      where: { username: usernameNormalized },
    });
    if (existingUsername) {
      throw new ConflictException(
        `Username '${usernameNormalized}' is already taken.`,
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
      username: usernameNormalized,
      name: createUserDto.name.trim(),
      email: emailNormalized,
      phone: createUserDto.phone ? createUserDto.phone.trim() : undefined,
      age: createUserDto.age,
      address: createUserDto.address ? createUserDto.address.trim() : undefined,

      password: hashedPassword,
      isActive:
        createUserDto.isActive !== undefined ? createUserDto.isActive : true,
      roles: [role],
    });

    const savedUser = await this.userRepository.save(user);
    return this.formatUser(savedUser);
  }

  /**
   * Get all users with optional filtering
   */
  async findAll(params?: {
    search?: string;
    status?: string;
    role?: string;
  }): Promise<FormattedUserResponse[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles');

    if (params?.search && params.search.trim().length > 0) {
      const search = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search OR user.phone LIKE :search)',
        { search },
      );
    }

    if (params?.status && params.status.trim().length > 0) {
      const statusUpper = params.status.trim().toUpperCase();
      if (statusUpper === 'ACTIVE') {
        qb.andWhere('user.isActive = :isActive', { isActive: true });
      } else if (statusUpper === 'INACTIVE') {
        qb.andWhere('user.isActive = :isActive', { isActive: false });
      }
    }

    if (params?.role && params.role.trim().length > 0) {
      const roleUpper = params.role.trim().toUpperCase();
      qb.andWhere('UPPER(roles.name) = :roleName', { roleName: roleUpper });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const users = await qb.getMany();
    return users.map((u) => this.formatUser(u));
  }

  /**
   * Find single user by ID
   */
  async findOne(id: string): Promise<FormattedUserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return this.formatUser(user);
  }

  /**
   * Update user details by ID
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<FormattedUserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    if (updateUserDto.username) {
      const usernameNormalized = updateUserDto.username.toLowerCase().trim();
      if (usernameNormalized !== user.username) {
        const existing = await this.userRepository.findOne({
          where: { username: usernameNormalized },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Username '${usernameNormalized}' is already taken by another account.`,
          );
        }
        user.username = usernameNormalized;
      }
    }

    if (updateUserDto.email) {
      const emailNormalized = updateUserDto.email.toLowerCase().trim();
      if (emailNormalized !== user.email) {
        const existing = await this.userRepository.findOne({
          where: { email: emailNormalized },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Email address '${emailNormalized}' is already registered by another account.`,
          );
        }
        user.email = emailNormalized;
      }
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name.trim();
    }
    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone
        ? updateUserDto.phone.trim()
        : (null as any);
    }
    if (updateUserDto.age !== undefined) {
      user.age = updateUserDto.age;
    }
    if (updateUserDto.address !== undefined) {
      user.address = updateUserDto.address
        ? updateUserDto.address.trim()
        : (null as any);
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }
    if (updateUserDto.password && updateUserDto.password.trim().length > 0) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.roleName) {
      const targetRoleName = updateUserDto.roleName.trim().toUpperCase();
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
      user.roles = [role];
    }

    const updatedUser = await this.userRepository.save(user);
    return this.formatUser(updatedUser);
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
