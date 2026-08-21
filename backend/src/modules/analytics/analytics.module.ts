import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Reel } from '../reels/entities/reel.entity';
import { ReelView } from '../reels/entities/reel-view.entity';
import { ReelLike } from '../reels/entities/reel-like.entity';
import { ReelBookmark } from '../reels/entities/reel-bookmark.entity';
import { Comment } from '../reels/entities/comment.entity';
import { Follow } from '../follows/entities/follow.entity';
import { User } from '../users/entities/user.entity';

import { StorageService } from '../reels/services/storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reel,
      ReelView,
      ReelLike,
      ReelBookmark,
      Comment,
      Follow,
      User,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, StorageService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
