import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { ReelsService } from './services/reels.service';
import {
  InitUploadDto,
  CompleteUploadDto,
  CreateCommentDto,
  CommentQueryDto,
  FeedQueryDto,
  UpdateReelDto,
  GetAllCommentsQueryDto,
} from './dto/reels.dto';
import {
  CreateReelReportDto,
  GetReelReportsQueryDto,
  UpdateReportStatusDto,
} from './dto/reel-report.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Reels')
@Controller('reels')
export class ReelsController {
  constructor(
    private readonly reelsService: ReelsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize video upload (Generate pre-signed URL)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pre-signed S3 URL generated successfully.',
  })
  @Post('upload/init')
  @HttpCode(HttpStatus.OK)
  initUpload(@Req() req: any, @Body() dto: InitUploadDto) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    return this.reelsService.initUpload(userId, dto, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete upload and queue processing worker' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcoding job queued successfully.',
  })
  @Post('upload/complete')
  @HttpCode(HttpStatus.OK)
  completeUpload(@Req() req: any, @Body() dto: CompleteUploadDto) {
    const userId = req.user.sub;
    return this.reelsService.completeUpload(userId, dto.uploadId);
  }

  @Public()
  @ApiOperation({ summary: 'Get paginated feed of READY reels' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feed items retrieved.' })
  @Get('feed')
  getFeed(@Req() req: Request, @Query() query: FeedQueryDto) {
    const userId = this.tryExtractUserId(req);
    const requestHost = req.headers.host;
    return this.reelsService.getFeed(userId, query, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recently watched reels (History)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'History retrieved.' })
  @Get('history')
  getHistory(@Req() req: any, @Query() query: FeedQueryDto) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    query.history = true;
    return this.reelsService.getFeed(userId, query, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reels commented on by current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Commented reels retrieved.' })
  @Get('commented')
  getCommented(@Req() req: any, @Query() query: FeedQueryDto) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    query.commented = true;
    return this.reelsService.getFeed(userId, query, requestHost);
  }

  @Public()
  @ApiOperation({ summary: 'Get dynamic trending tags and trending videos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending data retrieved.',
  })
  @Get('trending')
  getTrending(@Req() req: Request) {
    const requestHost = req.headers.host;
    return this.reelsService.getTrending(requestHost);
  }

  @Public()
  @ApiOperation({ summary: 'Get popular Vastu creators' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular creators retrieved.',
  })
  @Get('popular-creators')
  getPopularCreators(@Req() req: Request) {
    const userId = this.tryExtractUserId(req);
    const requestHost = req.headers.host;
    return this.reelsService.getPopularCreators(userId, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user submitted reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User reports list.',
  })
  @Get('reports/my')
  getMyReports(@Req() req: any) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    return this.reelsService.getMyReports(userId, requestHost);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Get reported reels moderation list' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports list with filters and counts.',
  })
  @Get('admin/reports')
  getAdminReports(@Req() req: any, @Query() query: GetReelReportsQueryDto) {
    const requestHost = req.headers.host;
    return this.reelsService.getAdminReports(query, requestHost);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Update report review status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report status updated.',
  })
  @Patch('admin/reports/:id/status')
  updateReportStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    const adminId = req.user?.sub;
    return this.reelsService.updateReportStatus(id, dto, adminId);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Take down reported video and resolve report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel deleted and report resolved.',
  })
  @Post('admin/reports/:id/takedown')
  @HttpCode(HttpStatus.OK)
  takedownReportedReel(@Req() req: any, @Param('id') id: string) {
    const adminId = req.user?.sub;
    return this.reelsService.takedownReportedReel(id, adminId);
  }

  @Public()
  @ApiOperation({ summary: 'Get single reel metadata by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel details retrieved.',
  })
  @Get(':id')
  getById(@Req() req: Request, @Param('id') id: string) {
    const userId = this.tryExtractUserId(req);
    const requestHost = req.headers.host;
    return this.reelsService.getById(id, userId, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a reel for inappropriate content/scam' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report submitted successfully.',
  })
  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  reportReel(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateReelReportDto,
  ) {
    const userId = req.user.sub;
    return this.reelsService.reportReel(userId, id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a reel' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel soft-deleted successfully.',
  })
  @Delete(':id')
  deleteReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const userRoles = req.user.roles || [];
    return this.reelsService.deleteReel(userId, id, userRoles);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update a reel metadata (title, caption, category, thumbnail, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel metadata updated successfully.',
  })
  @Patch(':id')
  updateReel(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReelDto,
  ) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    return this.reelsService.updateReel(userId, id, dto, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment or reply' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully.',
  })
  @Delete('comments/:commentId')
  deleteComment(@Req() req: any, @Param('commentId') commentId: string) {
    const userId = req.user.sub;
    const userRoles = req.user.roles || [];
    return this.reelsService.deleteComment(userId, commentId, userRoles);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a reel' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel liked successfully.',
  })
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  likeReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.likeReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a reel' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel unliked successfully.',
  })
  @Delete(':id/like')
  unlikeReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.unlikeReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark/Save a reel' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel bookmarked successfully.',
  })
  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  bookmarkReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.bookmarkReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark of a reel' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reel unbookmarked successfully.',
  })
  @Delete(':id/bookmark')
  unbookmarkReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.unbookmarkReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to a reel' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment created.' })
  @Post(':id/comments')
  addComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user.sub;
    return this.reelsService.addComment(userId, id, dto, req.headers?.host);
  }

  @Public()
  @ApiOperation({
    summary: 'Admin endpoint: Get all comments across all platform reels',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'All comments list.' })
  @Get('comments/all')
  getAllComments(
    @Req() req: Request,
    @Query() query: GetAllCommentsQueryDto,
  ) {
    return this.reelsService.getAllComments(query, req.headers?.host);
  }

  @Public()
  @ApiOperation({ summary: 'Get paginated comments or replies of a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments list.' })
  @Get(':id/comments')
  getComments(
    @Req() req: Request,
    @Param('id') id: string,
    @Query() query: CommentQueryDto,
  ) {
    const { userId, roles } = this.tryExtractUser(req);
    return this.reelsService.getComments(
      id,
      query,
      userId,
      req.headers?.host,
      roles,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a comment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment liked successfully.',
  })
  @Post('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  likeComment(@Req() req: any, @Param('commentId') commentId: string) {
    const userId = req.user.sub;
    return this.reelsService.likeComment(userId, commentId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment unliked successfully.',
  })
  @Delete('comments/:commentId/like')
  unlikeComment(@Req() req: any, @Param('commentId') commentId: string) {
    const userId = req.user.sub;
    return this.reelsService.unlikeComment(userId, commentId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin or unpin a comment on a reel (creator or admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment pinned/unpinned successfully.',
  })
  @Post('comments/:commentId/pin')
  @HttpCode(HttpStatus.OK)
  pinComment(@Req() req: any, @Param('commentId') commentId: string) {
    const userId = req.user.sub;
    const userRoles = req.user.roles || [];
    return this.reelsService.pinComment(userId, commentId, userRoles);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin a comment on a reel (creator or admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment unpinned successfully.',
  })
  @Delete('comments/:commentId/pin')
  unpinComment(@Req() req: any, @Param('commentId') commentId: string) {
    const userId = req.user.sub;
    const userRoles = req.user.roles || [];
    return this.reelsService.unpinComment(userId, commentId, userRoles);
  }

  @Public()
  @ApiOperation({ summary: 'Record a view on a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'View tracked.' })
  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  recordView(
    @Req() req: Request,
    @Param('id') id: string,
    @Ip() ipAddress: string,
  ) {
    const userId = this.tryExtractUserId(req);
    return this.reelsService.recordView(id, userId, ipAddress);
  }

  /**
   * Helper to manually extract and verify JWT token in public routes
   */
  private tryExtractUser(request: Request): {
    userId: string | null;
    roles: string[];
  } {
    const user = (request as any).user;
    if (user && user.sub) {
      return { userId: user.sub, roles: user.roles || [] };
    }

    const authorization = request.headers.authorization;
    if (authorization) {
      const [type, token] = authorization.split(' ');
      if (type === 'Bearer' && token) {
        try {
          const secret = this.configService.get<string>('JWT_SECRET');
          const payload = this.jwtService.verify(token, { secret });
          return {
            userId: payload?.sub || null,
            roles: payload?.roles || [],
          };
        } catch {
          // ignore verification errors for public endpoints
        }
      }
    }
    return { userId: null, roles: [] };
  }

  private tryExtractUserId(request: Request): string | null {
    return this.tryExtractUser(request).userId;
  }
}
