import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserGender } from '../enums/user-gender.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'davidmiller',
    description: 'Unique username like Instagram',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Username can only contain alphanumeric characters, underscores, and dots',
  })
  username: string;

  @ApiProperty({ example: 'David Miller', description: 'Full name of user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'david.m@example.com',
    description: 'Unique email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: '+1 555-0129',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: UserGender,
    example: UserGender.MALE,
    description: 'Gender of user',
  })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiPropertyOptional({ example: 28, description: 'Age of user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({
    example: '123 Main Street, New York, NY',
    description: 'Residential address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'Builder & Developer' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({ example: 'Building happy spaces with trust & quality.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'RERA Verified • 15+ Projects Delivered' })
  @IsOptional()
  @IsString()
  highlights?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'https://amanbuilders.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    example: 'SecurePassword123!',
    description: 'Account password',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Account active status',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'USER',
    default: 'USER',
    description: 'Assigned role name',
  })
  @IsOptional()
  @IsString()
  roleName?: string;
}
