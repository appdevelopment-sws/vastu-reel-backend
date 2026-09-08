import { Controller, Post, Get, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyRegisterOtpDto } from './dto/verify-register-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignUserRolesDto } from './dto/assign-role.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Permissions } from './decorators/permissions.decorator';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('check-username')
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiQuery({ name: 'username', type: String, required: true })
  async checkUsername(@Query('username') username: string) {
    return this.authService.checkUsername(username);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Direct registration' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('register/send-otp')
  @ApiOperation({ summary: 'Send email verification OTP for new account registration' })
  async sendRegisterOtp(@Body() dto: RegisterDto) {
    return this.authService.sendRegistrationOtp(dto);
  }

  @Public()
  @Post('register/verify-otp')
  @ApiOperation({ summary: 'Verify email registration OTP and activate user account' })
  async verifyRegisterOtp(@Body() dto: VerifyRegisterOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  @Public()
  @Post('forgot-password/send-otp')
  @ApiOperation({ summary: 'Send password reset OTP to registered email' })
  async sendForgotPasswordOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendForgotPasswordOtp(dto);
  }

  @Public()
  @Post('forgot-password/reset')
  @ApiOperation({ summary: 'Reset account password using verified OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Sign in or register with Google OAuth' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto);
  }

  @Public()
  @Post('phone/send-otp')
  @ApiOperation({ summary: 'Send OTP to mobile phone number' })
  async sendPhoneOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendPhoneOtp(dto);
  }

  @Public()
  @Post('phone/verify-otp')
  @ApiOperation({ summary: 'Verify mobile phone OTP and sign in or sign up' })
  async verifyPhoneOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyPhoneOtp(dto);
  }

  @Get('me')
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Public()
  @Post('seed')
  async seedDefaults() {
    return this.authService.seedDefaults();
  }

  @Roles('SUPER_ADMIN')
  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.authService.createRole(dto);
  }

  @Get('roles')
  async getAllRoles() {
    return this.authService.getAllRoles();
  }

  @Roles('SUPER_ADMIN')
  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.authService.createPermission(dto);
  }

  @Get('permissions')
  async getAllPermissions() {
    return this.authService.getAllPermissions();
  }

  @Roles('SUPER_ADMIN')
  @Post('assign-roles')
  async assignUserRoles(@Body() dto: AssignUserRolesDto) {
    return this.authService.assignUserRoles(dto);
  }
}
