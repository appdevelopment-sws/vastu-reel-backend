import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignUserRolesDto } from './dto/assign-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

import { Driver, DriverStatus } from '../driver/entities/driver.entity';
import { Operator } from '../operator/entities/operator.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Operator)
    private readonly operatorRepository: Repository<Operator>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults().catch(() => null);
  }

  /**
   * Helper to extract flat list of unique permissions from assigned roles
   */
  private extractPermissions(roles: Role[]): string[] {
    if (!roles) return [];
    const permissionsSet = new Set<string>();
    for (const role of roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          permissionsSet.add(perm.name);
        }
      }
    }
    return Array.from(permissionsSet);
  }

  /**
   * Register new user
   */
  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const targetRoleName = (dto.userType || dto.roleName || 'USER').trim().toUpperCase();

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

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      age: dto.age,
      address: dto.address,
      emergencyContact: dto.emergencyContact,
      password: hashedPassword,
      roles: [role],
    });

    await this.userRepository.save(user);

    // Auto-sync Driver entity creation if registering as a DRIVER
    if (targetRoleName === 'DRIVER') {
      let operator = await this.operatorRepository.findOne({ where: {} });
      if (!operator) {
        operator = await this.operatorRepository.save(
          this.operatorRepository.create({
            name: 'QuickBus Operations',
            code: 'QB-001',
            contactEmail: 'ops@quickbus.com',
            contactPhone: '+919876543210',
          }),
        );
      }

      const existingDriver = await this.driverRepository.findOne({
        where: [
          { userId: user.id },
          ...(user.phone ? [{ phone: user.phone }] : []),
        ],
      });

      if (!existingDriver) {
        await this.driverRepository.save(
          this.driverRepository.create({
            userId: user.id,
            operatorId: operator.id,
            name: user.name,
            phone: user.phone || '+919876543211',
            licenseNumber: `CDL-${Date.now().toString().slice(-8)}`,
            experienceYears: 5,
            rating: 5.0,
            status: DriverStatus.ACTIVE,
          }),
        );
      }
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Login user
   */
  async login(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    if (dto.userType && dto.userType.trim().length > 0) {
      const requiredRole = dto.userType.trim().toUpperCase();
      const userRoles = user.roles ? user.roles.map((r) => r.name.toUpperCase()) : [];
      const hasPermission =
        userRoles.includes(requiredRole) || userRoles.includes('SUPER_ADMIN');

      if (!hasPermission) {
        throw new UnauthorizedException(
          `Access denied: Your account is not authorized as a ${requiredRole}`,
        );
      }
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Generate JWT Token and Response Object
   */
  async generateAuthResponse(user: User) {
    const roleNames = user.roles ? user.roles.map((r) => r.name) : [];
    const permissions = this.extractPermissions(user.roles);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: roleNames,
      permissions,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        address: user.address,
        emergencyContact: user.emergencyContact,
        roles: roleNames,
        permissions,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleNames = user.roles ? user.roles.map((r) => r.name) : [];
    const permissions = this.extractPermissions(user.roles);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      address: user.address,
      emergencyContact: user.emergencyContact,
      roles: roleNames,
      permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update current user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          'Email already registered by another account',
        );
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }

    if (dto.age !== undefined) {
      user.age = dto.age;
    }

    if (dto.address !== undefined) {
      user.address = dto.address;
    }

    if (dto.emergencyContact !== undefined) {
      user.emergencyContact = dto.emergencyContact;
    }

    if (dto.password && dto.password.trim().length > 0) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepository.save(user);

    return this.getProfile(userId);
  }

  /**
   * Dynamic Role Creation
   */
  async createRole(dto: CreateRoleDto) {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Role already exists');
    }

    let permissions: Permission[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permissionRepository.findBy({
        id: In(dto.permissionIds),
      });
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      permissions,
    });

    return this.roleRepository.save(role);
  }

  /**
   * Dynamic Permission Creation
   */
  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.permissionRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Permission already exists');
    }

    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  /**
   * Assign Roles to User
   */
  async assignUserRoles(dto: AssignUserRolesDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
      relations: { roles: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.roleRepository.findBy({
      id: In(dto.roleIds),
    });

    user.roles = roles;
    await this.userRepository.save(user);

    return this.getProfile(user.id);
  }

  /**
   * Get all Roles
   */
  async getAllRoles() {
    return this.roleRepository.find({ relations: { permissions: true } });
  }

  /**
   * Get all Permissions
   */
  async getAllPermissions() {
    return this.permissionRepository.find();
  }

  /**
   * Seed Default Roles, Permissions, and Super Admin
   */
  async seedDefaults() {
    // 1. Create Default Permissions
    const defaultPermissions = [
      { name: 'buses:manage', resource: 'buses', action: 'manage' },
      { name: 'routes:manage', resource: 'routes', action: 'manage' },
      { name: 'trips:manage', resource: 'trips', action: 'manage' },
      { name: 'bookings:create', resource: 'bookings', action: 'create' },
      { name: 'bookings:read', resource: 'bookings', action: 'read' },
      { name: 'bookings:manage', resource: 'bookings', action: 'manage' },
      { name: 'reports:view', resource: 'reports', action: 'read' },
      { name: 'users:manage', resource: 'users', action: 'manage' },
    ];

    const savedPermissions: Permission[] = [];
    for (const p of defaultPermissions) {
      let perm = await this.permissionRepository.findOne({
        where: { name: p.name },
      });
      if (!perm) {
        perm = await this.permissionRepository.save(
          this.permissionRepository.create(p),
        );
      }
      savedPermissions.push(perm);
    }

    // 2. Create Default Roles
    const roleDefinitions = [
      {
        name: 'SUPER_ADMIN',
        description: 'Super Administrator with full system control',
        permissions: savedPermissions,
      },
      {
        name: 'USER',
        description: 'Passenger user who books seats',
        permissions: savedPermissions.filter((p) =>
          ['bookings:create', 'bookings:read'].includes(p.name),
        ),
      },
      {
        name: 'DRIVER',
        description: 'Bus driver viewing assigned trip details',
        permissions: savedPermissions.filter((p) =>
          ['trips:manage', 'bookings:read'].includes(p.name),
        ),
      },
      {
        name: 'AGENT',
        description: 'Booking agent managing customer tickets',
        permissions: savedPermissions.filter((p) =>
          ['bookings:create', 'bookings:read', 'bookings:manage'].includes(
            p.name,
          ),
        ),
      },
    ];

    for (const r of roleDefinitions) {
      let role = await this.roleRepository.findOne({
        where: { name: r.name },
      });
      if (!role) {
        role = this.roleRepository.create({
          name: r.name,
          description: r.description,
          permissions: r.permissions,
        });
        await this.roleRepository.save(role);
      }
    }

    // 3. Seed Default Super Admin User
    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ||
      this.configService.get<string>('SUPER_ADMIN_EMAIL') ||
      'admin@gmail.com';
    const adminPassword =
      this.configService.get<string>('ADMIN_PASSWORD') ||
      this.configService.get<string>('SUPER_ADMIN_PASSWORD') ||
      'Admin@123';

    let admin = await this.userRepository.findOne({
      where: { email: adminEmail.toLowerCase() },
    });

    if (!admin) {
      const superAdminRole = await this.roleRepository.findOne({
        where: { name: 'SUPER_ADMIN' },
      });

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = this.userRepository.create({
        name: 'Super Admin',
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        roles: superAdminRole ? [superAdminRole] : [],
      });
      await this.userRepository.save(admin);
    }

    return {
      message:
        'Default roles, permissions, and Super Admin seeded successfully',
      superAdminCredentials: {
        email: adminEmail,
        password: adminPassword,
      },
    };
  }
}
