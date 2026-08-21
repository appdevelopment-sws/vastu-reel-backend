import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsTimeframe {
  SEVEN_DAYS = '7d',
  TWENTY_EIGHT_DAYS = '28d',
  NINETY_DAYS = '90d',
  ALL_TIME = 'all',
}

export enum AnalyticsSortBy {
  VIEWS = 'views',
  LIKES = 'likes',
  COMMENTS = 'comments',
  ENGAGEMENT_RATE = 'engagement_rate',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsTimeframe,
    default: AnalyticsTimeframe.TWENTY_EIGHT_DAYS,
    description: 'Timeframe for analytics data (7d, 28d, 90d, all)',
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeframe)
  timeframe?: AnalyticsTimeframe = AnalyticsTimeframe.TWENTY_EIGHT_DAYS;
}

export class TopReelsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsSortBy,
    default: AnalyticsSortBy.VIEWS,
    description: 'Sort top reels by views, likes, comments, or engagement_rate',
  })
  @IsOptional()
  @IsEnum(AnalyticsSortBy)
  sortBy?: AnalyticsSortBy = AnalyticsSortBy.VIEWS;

  @ApiPropertyOptional({ default: 10, description: 'Number of top reels to return' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class ChartQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    default: 'views',
    description: 'Metric to plot (views, likes, comments, followers)',
  })
  @IsOptional()
  @IsString()
  metric?: string = 'views';
}
