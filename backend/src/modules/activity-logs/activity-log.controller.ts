import {
  Controller,
  Get,
  Query,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Activity')
@Controller('activity')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * Returns paginated activity for the authenticated user:
   * global events + events targeted to them (likes, comments, follows).
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my activity feed (global + personal)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Activity list returned.' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 30 })
  @Get()
  getMyActivity(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.sub;
    return this.activityLogService.getMyActivity(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
    );
  }

  /**
   * Returns all platform activity (admin audit log).
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all platform activity logs with filtering (admin)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All activity logs returned.' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 30 })
  @ApiQuery({ name: 'type', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @Get('all')
  getAllActivity(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.activityLogService.getAllActivity(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
      type,
      search,
    );
  }

  /**
   * Returns only global activity (public — no auth required).
   */
  @Public()
  @ApiOperation({ summary: 'Get global activity feed (public)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Global activity list returned.' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 30 })
  @Get('global')
  getGlobalActivity(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogService.getGlobalActivity(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
    );
  }
}
