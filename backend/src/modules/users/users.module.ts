import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { ReelView } from '../reels/entities/reel-view.entity';
import { ReelLike } from '../reels/entities/reel-like.entity';
import { ReelBookmark } from '../reels/entities/reel-bookmark.entity';
import { Comment } from '../reels/entities/comment.entity';
import { Follow } from '../follows/entities/follow.entity';
import { StorageService } from '../reels/services/storage.service';
import { Reel } from '../reels/entities/reel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      Reel,
      ReelView,
      ReelLike,
      ReelBookmark,
      Comment,
      Follow,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, StorageService],
  exports: [UsersService],
})
export class UsersModule {}
