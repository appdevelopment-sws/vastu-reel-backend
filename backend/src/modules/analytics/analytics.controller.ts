import { Controller, Get, Query, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  TopReelsQueryDto,
  ChartQueryDto,
} from './dto/analytics.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get creator overview analytics KPIs and percentage growth' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Overview metrics retrieved successfully.' })
  @Get('creator/overview')
  getOverview(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const userId = req.user.sub;
    return this.analyticsService.getOverview(userId, query.timeframe);
  }

  @ApiOperation({ summary: 'Get interactive time-series chart data for graphing' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chart data points retrieved.' })
  @Get('creator/chart')
  getChartData(@Req() req: any, @Query() query: ChartQueryDto) {
    const userId = req.user.sub;
    return this.analyticsService.getChartData(userId, query);
  }

  @ApiOperation({ summary: 'Get ranked top performing reels' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Top reels retrieved.' })
  @Get('creator/top-reels')
  getTopReels(@Req() req: any, @Query() query: TopReelsQueryDto) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    return this.analyticsService.getTopReels(userId, query, requestHost);
  }

  @ApiOperation({ summary: 'Get category / Vastu topic performance breakdown' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category metrics retrieved.' })
  @Get('creator/categories')
  getCategories(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const userId = req.user.sub;
    return this.analyticsService.getCategoryPerformance(userId, query.timeframe);
  }

  @ApiOperation({ summary: 'Get audience insights (peak hours, traffic sources, regions)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audience insights retrieved.' })
  @Get('creator/audience')
  getAudience(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const userId = req.user.sub;
    return this.analyticsService.getAudienceInsights(userId, query.timeframe);
  }

  @ApiOperation({ summary: 'Get recent audience interactions & comments feed' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recent comments and interactions retrieved.' })
  @Get('creator/recent-interactions')
  getRecentInteractions(@Req() req: any, @Query('limit') limit?: number) {
    const userId = req.user.sub;
    return this.analyticsService.getRecentInteractions(userId, limit ? Number(limit) : 15);
  }

  @ApiOperation({ summary: 'Get creator milestones, badges, and growth recommendations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Milestones retrieved.' })
  @Get('creator/milestones')
  getMilestones(@Req() req: any) {
    const userId = req.user.sub;
    return this.analyticsService.getMilestones(userId);
  }
}
