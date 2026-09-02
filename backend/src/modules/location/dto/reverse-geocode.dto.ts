import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReverseGeocodeQueryDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 19.076,
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 72.8777,
    required: true,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class ReverseGeocodeResponseDto {
  @ApiProperty({ example: 'Bandra West' })
  landmark: string;

  @ApiProperty({ example: 'Mumbai' })
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  state: string;

  @ApiProperty({ example: '400050' })
  pincode: string;

  @ApiProperty({ example: 'Bandra West, Mumbai, Maharashtra 400050' })
  formattedAddress: string;

  @ApiProperty({ example: 19.076 })
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  longitude: number;
}
