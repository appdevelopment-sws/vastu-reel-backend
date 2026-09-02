import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteProfile } from './entities/favorite-profile.entity';
import { FavoriteProfilesService } from './favorite-profiles.service';
import { FavoriteProfilesController } from './favorite-profiles.controller';
import { User } from '../users/entities/user.entity';
import { Follow } from '../follows/entities/follow.entity';
import { Reel } from '../reels/entities/reel.entity';
import { ActivityLogModule } from '../activity-logs/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FavoriteProfile, User, Follow, Reel]),
    ActivityLogModule,
  ],
  controllers: [FavoriteProfilesController],
  providers: [FavoriteProfilesService],
  exports: [FavoriteProfilesService],
})
export class FavoriteProfilesModule {}
