import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google OAuth ID Token or Access Token from Google Sign-In SDK/GSI',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsNotEmpty()
  @IsString()
  idToken: string;

  @ApiPropertyOptional({
    description: 'Optional role to assign if the user is newly created (e.g. USER, CREATOR)',
    example: 'USER',
    default: 'USER',
  })
  @IsOptional()
  @IsString()
  roleName?: string;

  @ApiPropertyOptional({
    description: 'Optional user type alias for role (e.g. USER, CREATOR)',
    example: 'USER',
  })
  @IsOptional()
  @IsString()
  userType?: string;
}
