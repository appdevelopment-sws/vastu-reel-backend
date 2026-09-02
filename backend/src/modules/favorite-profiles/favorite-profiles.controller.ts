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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { FavoriteProfilesService } from './favorite-profiles.service';
import { QueryFavoriteProfilesDto } from './dto/query-favorite-profiles.dto';

@ApiTags('Favorite Profiles')
@ApiBearerAuth()
@Controller(['users', 'api/v1/users'])
export class FavoriteProfilesController {
  constructor(
    private readonly favoriteProfilesService: FavoriteProfilesService,
  ) {}

  /**
   * Add a creator/user profile to favorites
   */
  @ApiOperation({ summary: 'Add a creator profile to favourites' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile added to favourites.',
  })
  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  favorite(@Req() req: any, @Param('id') targetId: string) {
    const userId = req.user.sub;
    return this.favoriteProfilesService.favorite(userId, targetId);
  }

  /**
   * Remove a creator/user profile from favorites
   */
  @ApiOperation({ summary: 'Remove a creator profile from favourites' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile removed from favourites.',
  })
  @Delete(':id/favorite')
  unfavorite(@Req() req: any, @Param('id') targetId: string) {
    const userId = req.user.sub;
    return this.favoriteProfilesService.unfavorite(userId, targetId);
  }

  /**
   * Check if a creator profile is favorited by the current user
   */
  @ApiOperation({ summary: 'Check if you have favourited a creator profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Favourite status returned.',
  })
  @Get(':id/favorite-status')
  async getFavoriteStatus(@Req() req: any, @Param('id') targetId: string) {
    const userId = req.user.sub;
    const isFavorite = await this.favoriteProfilesService.isFavorite(
      userId,
      targetId,
    );
    return { isFavorite };
  }

  /**
   * Get list of favorite creators for the logged-in user
   */
  @ApiOperation({ summary: 'Get current user list of favourite creators' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of favourite creators with stats.',
  })
  @Get('favorites/profiles')
  getFavorites(@Req() req: any, @Query() query: QueryFavoriteProfilesDto) {
    const userId = req.user.sub;
    return this.favoriteProfilesService.getFavorites(userId, query);
  }

  /**
   * Get count of favorite creators for the logged-in user
   */
  @ApiOperation({ summary: 'Get total count of favourite creators' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Total favourite creators count.',
  })
  @Get('favorites/count')
  async getFavoritesCount(@Req() req: any) {
    const userId = req.user.sub;
    const count = await this.favoriteProfilesService.getFavoritesCount(userId);
    return { count };
  }
}
