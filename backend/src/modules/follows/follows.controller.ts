import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
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
import { FavoriteProfilesService } from '../favorite-profiles/favorite-profiles.service';
import { QueryFollowsDto } from './dto/query-follows.dto';

@ApiTags('Follows')
@ApiBearerAuth()
@Controller(['users', 'api/v1/users'])
export class FollowsController {
  constructor(
    private readonly followsService: FollowsService,
    private readonly favoriteProfilesService: FavoriteProfilesService,
  ) {}

  /**
   * Follow a user
   */
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
  @ApiOperation({ summary: 'Check if you are following a user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Follow status returned.' })
  @Get(':id/follow-status')
  async getFollowStatus(@Req() req: any, @Param('id') targetId: string) {
    const followerId = req.user.sub;
    const isFollowing = await this.followsService.isFollowing(followerId, targetId);
    return { isFollowing };
  }

  /**
   * Get list of followers for a user profile
   */
  @ApiOperation({ summary: 'Get followers of a user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Followers list returned.' })
  @Get(':id/followers')
  async getFollowers(
    @Req() req: any,
    @Param('id') targetId: string,
    @Query() query: QueryFollowsDto,
  ) {
    const requestingUserId: string | null = req?.user?.sub ?? null;
    return this.followsService.getFollowers(targetId, requestingUserId, query);
  }

  /**
   * Get list of users that a target user is following
   */
  @ApiOperation({ summary: 'Get list of users followed by a user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Following list returned.' })
  @Get(':id/following')
  async getFollowing(
    @Req() req: any,
    @Param('id') targetId: string,
    @Query() query: QueryFollowsDto,
  ) {
    const requestingUserId: string | null = req?.user?.sub ?? null;
    return this.followsService.getFollowing(targetId, requestingUserId, query);
  }

  /**
   * Get follower + following counts + reels count for a user profile
   */
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
    let isFavorite = false;
    if (requestingUserId && requestingUserId !== targetId) {
      const [following, favorite] = await Promise.all([
        this.followsService.isFollowing(requestingUserId, targetId),
        this.favoriteProfilesService.isFavorite(requestingUserId, targetId),
      ]);
      isFollowing = following;
      isFavorite = favorite;
    }

    return {
      userId: targetId,
      followersCount,
      followingCount,
      isFollowing,
      isFavorite,
    };
  }
}
