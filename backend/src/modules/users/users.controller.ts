import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller(['users', 'user'])
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user account' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all user accounts with video stats & optional filters',
  })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'status', type: String, required: false })
  @ApiQuery({ name: 'role', type: String, required: false })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll({ search, status, role });
  }

  @Get(':id/creator-summary')
  @ApiOperation({ summary: 'Get creator summary and performance KPIs' })
  getCreatorSummary(@Param('id') id: string) {
    return this.usersService.getCreatorSummary(id);
  }

  @Get(':id/reels')
  @ApiOperation({ summary: 'Get all reels uploaded by a specific creator' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'status', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  getCreatorReels(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const requestHost = req?.headers?.host;
    return this.usersService.getCreatorReels(
      id,
      { page, limit, status, search },
      requestHost,
    );
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get time series & category analytics for creator' })
  @ApiQuery({ name: 'timeframe', type: String, required: false })
  @ApiQuery({ name: 'metric', type: String, required: false })
  getCreatorAnalytics(
    @Param('id') id: string,
    @Query('timeframe') timeframe?: string,
    @Query('metric') metric?: string,
  ) {
    return this.usersService.getCreatorAnalytics(id, { timeframe, metric });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Block or unblock user account' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean; reason?: string },
  ) {
    return this.usersService.updateStatus(id, body.isActive, body.reason);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Block user account' })
  blockUser(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.usersService.updateStatus(id, false, body?.reason);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Unblock user account' })
  unblockUser(@Param('id') id: string) {
    return this.usersService.updateStatus(id, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user account details by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user account details by ID' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account by ID' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
