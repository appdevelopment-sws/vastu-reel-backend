import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { ReelsController } from './reels.controller';
import { ReelsService } from './services/reels.service';
import { ReelsProcessor } from './reels.processor';
import { StorageService } from './services/storage.service';

import { Reel } from './entities/reel.entity';
import { ReelMedia } from './entities/reel-media.entity';
import { ReelUpload } from './entities/reel-upload.entity';
import { ReelLike } from './entities/reel-like.entity';
import { ReelComment } from './entities/reel-comment.entity';
import { ReelView } from './entities/reel-view.entity';
import { ReelBookmark } from './entities/reel-bookmark.entity';
import { User } from '../users/entities/user.entity';
import { ActivityLogModule } from '../activity-logs/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reel,
      ReelMedia,
      ReelUpload,
      ReelLike,
      ReelComment,
      ReelView,
      ReelBookmark,
      User,
    ]),
    BullModule.registerQueue({
      name: 'video-processing',
    }),
    ActivityLogModule,
  ],
  controllers: [ReelsController],
  providers: [ReelsService, ReelsProcessor, StorageService],
  exports: [ReelsService, StorageService],
})
export class ReelsModule {}
