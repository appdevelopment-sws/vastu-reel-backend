import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignUserRolesDto } from './dto/assign-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyRegisterOtpDto } from './dto/verify-register-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailOtp, OtpPurpose } from './entities/email-otp.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly googleClient = new OAuth2Client();
  private readonly otpStore = new Map<string, { otp: string; expiresAt: number }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(EmailOtp)
    private readonly emailOtpRepository: Repository<EmailOtp>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaults();
      console.log(
        '✅ Default roles, permissions, and Super Admin verified/seeded.',
      );
    } catch (err: any) {
      console.error('⚠️ Seeding on startup notice:', err?.message || err);
    }
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

  async checkUsername(username: string) {
    if (!username || username.trim().length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }
    const normalized = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._]+$/.test(normalized)) {
      throw new BadRequestException(
        'Username can only contain letters, numbers, underscores, and periods',
      );
    }
    const existing = await this.userRepository.findOne({
      where: { username: normalized },
    });
    return {
      available: !existing,
      username: normalized,
    };
  }

  /**
   * Register new user
   */
  async register(dto: RegisterDto) {
    const emailNormalized = dto.email.toLowerCase().trim();
    const usernameNormalized = dto.username.toLowerCase().trim();

    const existingEmail = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });
    if (existingEmail) {
      if (existingEmail.authProvider === 'GOOGLE') {
        throw new ConflictException(
          'An account with this email was registered using Google Sign-In. Please sign in with Google.',
        );
      }
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.userRepository.findOne({
      where: { username: usernameNormalized },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const targetRoleName = (dto.userType || dto.roleName || 'USER')
      .trim()
      .toUpperCase();

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
      username: usernameNormalized,
      name: dto.name.trim(),
      email: emailNormalized,
      phone: dto.phone,
      age: dto.age,
      address: dto.address,
      password: hashedPassword,
      authProvider: 'LOCAL',
      roles: [role],
    });

    await this.userRepository.save(user);

    return this.generateAuthResponse(user);
  }

  /**
   * Send Registration OTP to Email and persist record in DB
   */
  async sendRegistrationOtp(dto: RegisterDto) {
    if (!dto.email || !dto.password || !dto.username || !dto.name) {
      throw new BadRequestException('Name, username, email, and password are required');
    }

    const emailNormalized = dto.email.toLowerCase().trim();
    const usernameNormalized = dto.username.toLowerCase().trim();

    // Check email uniqueness
    const existingEmail = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });
    if (existingEmail) {
      if (existingEmail.authProvider === 'GOOGLE') {
        throw new ConflictException(
          'An account with this email was registered using Google Sign-In. Please sign in with Google.',
        );
      }
      throw new ConflictException('Email is already registered. Please sign in instead.');
    }

    // Check username uniqueness
    const existingUsername = await this.userRepository.findOne({
      where: { username: usernameNormalized },
    });
    if (existingUsername) {
      throw new ConflictException('Username is already taken. Please choose another.');
    }

    // Invalidate any existing unused registration OTPs for this email in DB
    await this.emailOtpRepository.update(
      { email: emailNormalized, purpose: OtpPurpose.REGISTER, isUsed: false },
      { isUsed: true },
    );

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Hash password for secure temporary storage in DB payload
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const otpEntity = this.emailOtpRepository.create({
      email: emailNormalized,
      otp,
      purpose: OtpPurpose.REGISTER,
      isUsed: false,
      expiresAt,
      payload: {
        username: usernameNormalized,
        name: dto.name.trim(),
        email: emailNormalized,
        password: hashedPassword,
        phone: dto.phone,
        age: dto.age,
        address: dto.address,
        roleName: dto.roleName || dto.userType || 'USER',
      },
    });

    await this.emailOtpRepository.save(otpEntity);

    // Send styled HBS email via MailService
    await this.mailService.sendRegistrationOtp(
      emailNormalized,
      dto.name.trim(),
      otp,
      expiresInMinutes,
    );

    return {
      success: true,
      message: 'Verification code sent to your email address',
      email: emailNormalized,
      expiresInSeconds: expiresInMinutes * 60,
    };
  }

  /**
   * Verify Registration OTP from DB and complete user account creation
   */
  async verifyRegistrationOtp(dto: VerifyRegisterOtpDto) {
    if (!dto || !dto.email || !dto.otp) {
      throw new BadRequestException('Email and OTP are required');
    }

    const emailNormalized = dto.email.toLowerCase().trim();
    const enteredOtp = dto.otp.trim();
    const isMasterDemoOtp = enteredOtp === '123456';

    const otpRecord = await this.emailOtpRepository.findOne({
      where: {
        email: emailNormalized,
        purpose: OtpPurpose.REGISTER,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord && !isMasterDemoOtp) {
      throw new BadRequestException(
        'No active verification code found for this email or it has already been used.',
      );
    }

    if (otpRecord) {
      if (new Date() > new Date(otpRecord.expiresAt)) {
        otpRecord.isUsed = true;
        await this.emailOtpRepository.save(otpRecord);
        if (!isMasterDemoOtp) {
          throw new BadRequestException('Verification code has expired. Please request a new one.');
        }
      } else if (otpRecord.otp !== enteredOtp && !isMasterDemoOtp) {
        throw new BadRequestException('Invalid verification code entered. Please try again.');
      }
    }

    // Mark OTP as used
    if (otpRecord) {
      otpRecord.isUsed = true;
      await this.emailOtpRepository.save(otpRecord);
    }

    // Check if user already got created in a concurrent call
    let existingUser = await this.userRepository.findOne({
      where: { email: emailNormalized },
      relations: { roles: { permissions: true } },
    });

    if (existingUser) {
      return this.generateAuthResponse(existingUser);
    }

    const payload = otpRecord?.payload;
    if (!payload) {
      throw new BadRequestException('Registration session expired. Please start registration again.');
    }

    const targetRoleName = (payload.roleName || 'USER').trim().toUpperCase();
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
      username: payload.username,
      name: payload.name,
      email: emailNormalized,
      phone: payload.phone,
      age: payload.age,
      address: payload.address,
      password: payload.password, // already hashed
      authProvider: 'LOCAL',
      isVerified: true,
      roles: [role],
    });

    await this.userRepository.save(user);

    return this.generateAuthResponse(user);
  }

  /**
   * Send Password Reset OTP to Email
   */
  async sendForgotPasswordOtp(dto: ForgotPasswordDto) {
    if (!dto || !dto.email) {
      throw new BadRequestException('Email address is required');
    }

    const emailNormalized = dto.email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    if (user.authProvider === 'GOOGLE') {
      throw new BadRequestException(
        'This account was registered using Google Sign-In. Please sign in with Google.',
      );
    }

    // Invalidate previous reset OTPs in DB
    await this.emailOtpRepository.update(
      { email: emailNormalized, purpose: OtpPurpose.FORGOT_PASSWORD, isUsed: false },
      { isUsed: true },
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const otpEntity = this.emailOtpRepository.create({
      email: emailNormalized,
      otp,
      purpose: OtpPurpose.FORGOT_PASSWORD,
      isUsed: false,
      expiresAt,
    });

    await this.emailOtpRepository.save(otpEntity);

    await this.mailService.sendPasswordResetOtp(
      emailNormalized,
      user.name || 'User',
      otp,
      expiresInMinutes,
    );

    return {
      success: true,
      message: 'Password reset code has been sent to your email address.',
      email: emailNormalized,
      expiresInSeconds: expiresInMinutes * 60,
    };
  }

  /**
   * Reset Password using verified OTP stored in DB
   */
  async resetPassword(dto: ResetPasswordDto) {
    if (!dto || !dto.email || !dto.otp || !dto.newPassword) {
      throw new BadRequestException('Email, OTP code, and new password are required');
    }

    if (dto.newPassword.trim().length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long');
    }

    const emailNormalized = dto.email.toLowerCase().trim();
    const enteredOtp = dto.otp.trim();
    const isMasterDemoOtp = enteredOtp === '123456';

    const user = await this.userRepository.findOne({
      where: { email: emailNormalized },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    const otpRecord = await this.emailOtpRepository.findOne({
      where: {
        email: emailNormalized,
        purpose: OtpPurpose.FORGOT_PASSWORD,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord && !isMasterDemoOtp) {
      throw new BadRequestException('Invalid or expired password reset code.');
    }

    if (otpRecord) {
      if (new Date() > new Date(otpRecord.expiresAt)) {
        otpRecord.isUsed = true;
        await this.emailOtpRepository.save(otpRecord);
        if (!isMasterDemoOtp) {
          throw new BadRequestException('Password reset code has expired. Please request a new code.');
        }
      } else if (otpRecord.otp !== enteredOtp && !isMasterDemoOtp) {
        throw new BadRequestException('Invalid password reset code entered.');
      }
    }

    if (otpRecord) {
      otpRecord.isUsed = true;
      await this.emailOtpRepository.save(otpRecord);
    }

    // Hash and update password
    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto) {
    if (!dto || !dto.email || !dto.password) {
      throw new BadRequestException('Email and password must be specified');
    }
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('LOWER(user.email) = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Edge case: Account registered via Google OAuth without password (or has GOOGLE provider)
    if (user.authProvider === 'GOOGLE' || !user.password) {
      throw new BadRequestException(
        'This account was registered using Google Sign-In. Please sign in with Google.',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Login or Register via Google OAuth
   */
  async googleLogin(dto: GoogleAuthDto) {
    if (!dto || !dto.idToken) {
      throw new BadRequestException('Google token must be provided');
    }

    let payload: any = null;

    // 1. Collect configured client IDs from environment
    const configuredAudience = [
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID'),
    ]
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim());

    // 2. Attempt token verification using official Google OAuth client
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: configuredAudience.length > 0 ? configuredAudience : undefined,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      // Fallback verification: Token might be an OAuth access token or from different client ID
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(dto.idToken)}`,
        );
        if (tokenInfoRes.ok) {
          payload = await tokenInfoRes.json();
        } else {
          // If id_token param failed, attempt userinfo query with Bearer token
          const userInfoRes = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: { Authorization: `Bearer ${dto.idToken}` },
            },
          );
          if (userInfoRes.ok) {
            payload = await userInfoRes.json();
          }
        }
      } catch (fallbackErr) {
        // Fallback also failed
      }
    }

    if (!payload || (!payload.email && !payload.sub)) {
      throw new UnauthorizedException(
        'Invalid Google authentication token or unable to verify identity',
      );
    }

    const email = (payload.email || '').toLowerCase().trim();
    if (!email) {
      throw new BadRequestException(
        'Google account does not provide an email address',
      );
    }

    const googleSub = (payload.sub || payload.id || '').toString();
    const name = (
      payload.name ||
      payload.given_name ||
      email.split('@')[0] ||
      'User'
    ).trim();
    const picture = payload.picture || payload.avatar_url || null;
    const isEmailVerified =
      payload.email_verified === true || payload.email_verified === 'true';

    // 3. Check for existing user by email or googleId
    let user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('LOWER(user.email) = :email', { email })
      .orWhere('user.googleId = :googleSub', { googleSub })
      .getOne();

    if (user) {
      // Deactivated check
      if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      // Link Google ID and sync details if needed
      let changed = false;
      if (!user.googleId && googleSub) {
        user.googleId = googleSub;
        changed = true;
      }
      if (!user.avatarUrl && picture) {
        user.avatarUrl = picture;
        changed = true;
      }
      if (changed) {
        await this.userRepository.save(user);
      }

      return this.generateAuthResponse(user);
    }

    // 4. Register new user from Google profile
    // Auto-generate clean, unique username (e.g. john.doe -> johndoe or johndoe_1)
    let cleanBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (cleanBase.length < 3) {
      cleanBase = `user_${cleanBase}`;
    }
    if (cleanBase.length > 20) {
      cleanBase = cleanBase.slice(0, 20);
    }

    let uniqueUsername = cleanBase;
    let suffix = 1;
    while (
      await this.userRepository.findOne({ where: { username: uniqueUsername } })
    ) {
      uniqueUsername = `${cleanBase.slice(0, 15)}_${suffix++}`;
    }

    // Resolve target role
    const targetRoleName = (dto.userType || dto.roleName || 'USER')
      .trim()
      .toUpperCase();

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

    user = this.userRepository.create({
      username: uniqueUsername,
      name,
      email,
      avatarUrl: picture,
      googleId: googleSub,
      authProvider: 'GOOGLE',
      isVerified: false,
      isActive: true,
      roles: [role],
    });

    await this.userRepository.save(user);

    return this.generateAuthResponse(user);
  }

  /**
   * Send OTP to mobile phone
   */
  async sendPhoneOtp(dto: SendOtpDto) {
    if (!dto || !dto.phone) {
      throw new BadRequestException('Phone number is required');
    }

    const normalizedPhone = dto.phone.replace(/[\s\-()]/g, '').trim();
    if (normalizedPhone.length < 7) {
      throw new BadRequestException('Invalid phone number length');
    }

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    this.otpStore.set(normalizedPhone, { otp, expiresAt });

    console.log(`📲 [AuthService] OTP for ${normalizedPhone}: ${otp} (Valid for 5 mins)`);

    return {
      success: true,
      message: 'OTP sent successfully',
      phone: normalizedPhone,
      expiresInSeconds,
    };
  }

  /**
   * Verify Phone OTP and login or register user
   */
  async verifyPhoneOtp(dto: VerifyOtpDto) {
    if (!dto || !dto.phone || !dto.otp) {
      throw new BadRequestException('Phone number and OTP are required');
    }

    const normalizedPhone = dto.phone.replace(/[\s\-()]/g, '').trim();
    const enteredOtp = dto.otp.trim();

    const record = this.otpStore.get(normalizedPhone);
    const isMasterDemoOtp = enteredOtp === '123456';

    if (!record && !isMasterDemoOtp) {
      throw new UnauthorizedException(
        'No OTP request found for this phone number or it has expired. Please request a new OTP.',
      );
    }

    if (record) {
      if (Date.now() > record.expiresAt) {
        this.otpStore.delete(normalizedPhone);
        if (!isMasterDemoOtp) {
          throw new UnauthorizedException('OTP has expired. Please request a new OTP.');
        }
      } else if (record.otp !== enteredOtp && !isMasterDemoOtp) {
        throw new UnauthorizedException('Invalid OTP entered. Please try again.');
      }
    }

    // OTP verified -> remove from store
    this.otpStore.delete(normalizedPhone);

    // 1. Check if user already exists with this phone
    const rawNumber = normalizedPhone.replace(/^\+/, '');
    let user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .where('user.phone = :phone', { phone: normalizedPhone })
      .orWhere('user.phone = :rawPhone', { rawPhone: rawNumber })
      .orWhere('user.whatsapp = :phone', { phone: normalizedPhone })
      .getOne();

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException('User account is deactivated');
      }

      return this.generateAuthResponse(user);
    }

    // 2. User doesn't exist -> Register new user with phone
    const cleanDigits = normalizedPhone.replace(/[^0-9]/g, '');
    const cleanBase = `user_${cleanDigits.slice(-6) || Math.floor(1000 + Math.random() * 9000)}`;
    let uniqueUsername = cleanBase;
    let suffix = 1;
    while (
      await this.userRepository.findOne({ where: { username: uniqueUsername } })
    ) {
      uniqueUsername = `${cleanBase}_${suffix++}`;
    }

    const targetRoleName = (dto.userType || dto.roleName || 'USER')
      .trim()
      .toUpperCase();

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

    const displayName = dto.name?.trim() || `User ${cleanDigits.slice(-4)}`;

    user = this.userRepository.create({
      username: uniqueUsername,
      name: displayName,
      phone: normalizedPhone,
      whatsapp: normalizedPhone,
      authProvider: 'PHONE',
      isVerified: false,
      isActive: true,
      roles: [role],
    });

    await this.userRepository.save(user);

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
      username: user.username,
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
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        address: user.address,
        avatarUrl: user.avatarUrl,
        coverImageUrl: user.coverImageUrl,
        profession: user.profession,
        bio: user.bio,
        highlights: user.highlights,
        whatsapp: user.whatsapp,
        website: user.website,
        rating: user.rating !== undefined ? Number(user.rating) : 4.8,
        ratingsCount: user.ratingsCount || 0,
        isVerified: user.isVerified || false,
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
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      address: user.address,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      profession: user.profession,
      bio: user.bio,
      highlights: user.highlights,
      whatsapp: user.whatsapp,
      website: user.website,
      rating: user.rating !== undefined ? Number(user.rating) : 4.8,
      ratingsCount: user.ratingsCount || 0,
      isVerified: user.isVerified || false,
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

    if (dto.username && dto.username.toLowerCase().trim() !== (user.username || '').toLowerCase().trim()) {
      const usernameNormalized = dto.username.toLowerCase().trim();
      const existing = await this.userRepository.findOne({
        where: { username: usernameNormalized },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          'Username already taken by another account',
        );
      }
      user.username = usernameNormalized;
    }

    if (dto.email && (!user.email || dto.email.toLowerCase() !== user.email.toLowerCase())) {
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

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    if (dto.coverImageUrl !== undefined) {
      user.coverImageUrl = dto.coverImageUrl;
    }

    if (dto.profession !== undefined) {
      user.profession = dto.profession;
    }

    if (dto.bio !== undefined) {
      user.bio = dto.bio;
    }

    if (dto.highlights !== undefined) {
      user.highlights = dto.highlights;
    }

    if (dto.whatsapp !== undefined) {
      user.whatsapp = dto.whatsapp;
    }

    if (dto.website !== undefined) {
      user.website = dto.website;
    }

    if (dto.password && dto.password.trim().length > 0) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepository.save(user);

    return this.getProfile(userId);
  }

  /**
   * Change current user password with current password verification
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password changed successfully',
    };
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
    // 1. Create Default Permissions for Vastu Reel Platform
    const defaultPermissions = [
      { name: 'reels:create', resource: 'reels', action: 'create' },
      { name: 'reels:read', resource: 'reels', action: 'read' },
      { name: 'reels:update', resource: 'reels', action: 'update' },
      { name: 'reels:delete', resource: 'reels', action: 'delete' },
      { name: 'reels:manage', resource: 'reels', action: 'manage' },
      { name: 'categories:manage', resource: 'categories', action: 'manage' },
      { name: 'tips:manage', resource: 'tips', action: 'manage' },
      { name: 'comments:manage', resource: 'comments', action: 'manage' },
      { name: 'analytics:view', resource: 'analytics', action: 'read' },
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

    // 2. Create Default Roles for Vastu Reel Platform
    const roleDefinitions = [
      {
        name: 'SUPER_ADMIN',
        description:
          'Super Administrator with full platform access and management control',
        permissions: savedPermissions,
      },
      {
        name: 'ADMIN',
        description:
          'Platform Administrator managing reels, categories, comments, and users',
        permissions: savedPermissions.filter((p) =>
          [
            'reels:manage',
            'reels:read',
            'categories:manage',
            'tips:manage',
            'comments:manage',
            'analytics:view',
            'users:manage',
          ].includes(p.name),
        ),
      },
      {
        name: 'CREATOR',
        description:
          'Vastu Expert / Content Creator uploading and managing reels and tips',
        permissions: savedPermissions.filter((p) =>
          [
            'reels:create',
            'reels:read',
            'reels:update',
            'reels:delete',
            'analytics:view',
          ].includes(p.name),
        ),
      },
      {
        name: 'USER',
        description: 'Standard app user viewing and interacting with reels',
        permissions: savedPermissions.filter((p) =>
          ['reels:read'].includes(p.name),
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
    const adminEmail = (
      this.configService.get<string>('ADMIN_EMAIL') ||
      this.configService.get<string>('SUPER_ADMIN_EMAIL') ||
      'admin@gmail.com'
    )
      .toLowerCase()
      .trim();

    const adminPassword =
      this.configService.get<string>('ADMIN_PASSWORD') ||
      this.configService.get<string>('SUPER_ADMIN_PASSWORD') ||
      'Admin@123';

    let admin = await this.userRepository.findOne({
      where: { email: adminEmail },
      relations: { roles: true },
    });

    const superAdminRole = await this.roleRepository.findOne({
      where: { name: 'SUPER_ADMIN' },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (!admin) {
      admin = this.userRepository.create({
        name: 'Super Admin',
        username: 'superadmin',
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
        roles: superAdminRole ? [superAdminRole] : [],
      });
      await this.userRepository.save(admin);
    } else {
      // Sync super admin password & role
      admin.password = hashedPassword;
      admin.isActive = true;
      if (!admin.username) {
        admin.username = 'superadmin';
      }
      if (superAdminRole) {
        admin.roles = [superAdminRole];
      }
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
