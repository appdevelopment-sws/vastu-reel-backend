import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number with country code (e.g. +919876543210)',
    example: '+919876543210',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Please provide a valid phone number with country code',
  })
  phone: string;
}
