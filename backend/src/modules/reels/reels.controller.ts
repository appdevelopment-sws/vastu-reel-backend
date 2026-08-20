import {
  Controller,
  Post,
  Get,
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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { ReelsService } from './services/reels.service';
import { InitUploadDto, CompleteUploadDto, CreateCommentDto, FeedQueryDto } from './dto/reels.dto';
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
  @ApiOperation({ summary: 'Initialize video upload (Generate pre-signed URL)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pre-signed S3 URL generated successfully.' })
  @Post('upload/init')
  @HttpCode(HttpStatus.OK)
  initUpload(@Req() req: any, @Body() dto: InitUploadDto) {
    const userId = req.user.sub;
    const requestHost = req.headers.host;
    return this.reelsService.initUpload(userId, dto, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete upload and queue processing worker' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transcoding job queued successfully.' })
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

  @Public()
  @ApiOperation({ summary: 'Get single reel metadata by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reel details retrieved.' })
  @Get(':id')
  getById(@Req() req: Request, @Param('id') id: string) {
    const userId = this.tryExtractUserId(req);
    const requestHost = req.headers.host;
    return this.reelsService.getById(id, userId, requestHost);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reel soft-deleted successfully.' })
  @Delete(':id')
  deleteReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.deleteReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reel liked successfully.' })
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  likeReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.likeReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reel unliked successfully.' })
  @Delete(':id/like')
  unlikeReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.unlikeReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark/Save a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reel bookmarked successfully.' })
  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  bookmarkReel(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.reelsService.bookmarkReel(userId, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark of a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reel unbookmarked successfully.' })
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
    return this.reelsService.addComment(userId, id, dto);
  }

  @Public()
  @ApiOperation({ summary: 'Get comments of a reel' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments list.' })
  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.reelsService.getComments(id);
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
  private tryExtractUserId(request: Request): string | null {
    const user = (request as any).user;
    if (user && user.sub) {
      return user.sub;
    }

    const authorization = request.headers.authorization;
    if (authorization) {
      const [type, token] = authorization.split(' ');
      if (type === 'Bearer' && token) {
        try {
          const secret = this.configService.get<string>('JWT_SECRET');
          const payload = this.jwtService.verify(token, { secret });
          return payload?.sub || null;
        } catch {
          // ignore verification errors for public endpoints
        }
      }
    }
    return null;
  }
}
