import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LocationService } from './location.service';
import {
  ReverseGeocodeQueryDto,
  ReverseGeocodeResponseDto,
} from './dto/reverse-geocode.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Get('reverse-geocode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse geocode latitude and longitude to structured address',
    description:
      'Translates GPS coordinates into structured landmark, city, state, pincode, and formatted address.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reverse geocoded location details',
    type: ReverseGeocodeResponseDto,
  })
  async reverseGeocode(
    @Query() query: ReverseGeocodeQueryDto,
  ): Promise<ReverseGeocodeResponseDto> {
    return this.locationService.reverseGeocode(query.lat, query.lng);
  }
}
