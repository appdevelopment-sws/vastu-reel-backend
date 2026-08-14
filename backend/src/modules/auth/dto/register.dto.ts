import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 25, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ example: '123 Main St', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'USER', required: false })
  @IsOptional()
  @IsString()
  roleName?: string; // Optional: "USER", "CREATOR", "ADMIN", etc. Default "USER"

  @ApiPropertyOptional({ example: 'CREATOR', required: false })
  @IsOptional()
  @IsString()
  userType?: string; // Optional: Alias for roleName
}
