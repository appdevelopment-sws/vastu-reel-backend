import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
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

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString({ message: 'OTP code must be a string' })
  @Length(4, 8, { message: 'OTP code must be 4 to 8 digits' })
  otp: string;

  @ApiPropertyOptional({
    description: 'Optional role to assign if user is newly created (e.g. USER, CREATOR)',
    example: 'USER',
    default: 'USER',
  })
  @IsOptional()
  @IsString()
  roleName?: string;

  @ApiPropertyOptional({
    description: 'Optional user type alias for role',
    example: 'USER',
  })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({
    description: 'Optional full name for the user profile',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
