import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
