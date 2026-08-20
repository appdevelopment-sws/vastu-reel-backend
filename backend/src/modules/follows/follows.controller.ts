import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FollowsService } from './follows.service';

@ApiTags('Follows')
@Controller('users')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  /**
   * Follow a user
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Followed successfully.' })
  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  follow(@Req() req: any, @Param('id') targetId: string) {
    const followerId = req.user.sub;
    return this.followsService.follow(followerId, targetId);
  }

  /**
   * Unfollow a user
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Unfollowed successfully.' })
  @Delete(':id/follow')
  unfollow(@Req() req: any, @Param('id') targetId: string) {
    const followerId = req.user.sub;
    return this.followsService.unfollow(followerId, targetId);
  }

  /**
   * Check follow status between current user and target user
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if you are following a user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Follow status returned.' })
  @Get(':id/follow-status')
  async getFollowStatus(@Req() req: any, @Param('id') targetId: string) {
    const followerId = req.user.sub;
    const isFollowing = await this.followsService.isFollowing(followerId, targetId);
    return { isFollowing };
  }

  /**
   * Get follower + following counts + reels count for a user profile
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile stats (followers, following, reels)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile stats returned.' })
  @Get(':id/stats')
  async getStats(@Req() req: any, @Param('id') targetId: string) {
    const requestingUserId: string | null = req?.user?.sub ?? null;

    const [followersCount, followingCount] = await Promise.all([
      this.followsService.getFollowerCount(targetId),
      this.followsService.getFollowingCount(targetId),
    ]);

    let isFollowing = false;
    if (requestingUserId && requestingUserId !== targetId) {
      isFollowing = await this.followsService.isFollowing(requestingUserId, targetId);
    }

    return {
      userId: targetId,
      followersCount,
      followingCount,
      isFollowing,
    };
  }
}
