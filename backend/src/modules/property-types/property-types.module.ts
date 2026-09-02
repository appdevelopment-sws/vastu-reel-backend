import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyType } from './entities/property-type.entity';
import { Reel } from '../reels/entities/reel.entity';
import { PropertyTypesService } from './services/property-types.service';
import { PropertyTypesController } from './property-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyType, Reel])],
  controllers: [PropertyTypesController],
  providers: [PropertyTypesService],
  exports: [PropertyTypesService],
})
export class PropertyTypesModule {}
