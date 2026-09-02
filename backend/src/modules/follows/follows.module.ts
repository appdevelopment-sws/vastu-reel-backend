import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './entities/follow.entity';
import { FollowsService } from './follows.service';
import { FollowsController } from './follows.controller';
import { ActivityLogModule } from '../activity-logs/activity-log.module';
import { User } from '../users/entities/user.entity';
import { Reel } from '../reels/entities/reel.entity';
import { FavoriteProfile } from '../favorite-profiles/entities/favorite-profile.entity';
import { FavoriteProfilesModule } from '../favorite-profiles/favorite-profiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, User, Reel, FavoriteProfile]),
    ActivityLogModule,
    FavoriteProfilesModule,
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
