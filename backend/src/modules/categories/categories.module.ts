import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { SubCategory } from './entities/sub-category.entity';
import { PropertyType } from '../property-types/entities/property-type.entity';
import { Reel } from '../reels/entities/reel.entity';
import { CategoriesService } from './services/categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, SubCategory, PropertyType, Reel])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
