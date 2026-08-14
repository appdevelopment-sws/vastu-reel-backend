import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'password123' })
  password: string;

  @ApiProperty({ example: '+1234567890', required: false })
  phone?: string;

  @ApiProperty({ example: 25, required: false })
  age?: number;

  @ApiProperty({ example: '123 Main St', required: false })
  address?: string;

  @ApiProperty({ example: '+1987654321', required: false })
  emergencyContact?: string;

  @ApiProperty({ example: 'USER', required: false })
  roleName?: string; // Optional: "USER", "DRIVER", "AGENT", etc. Default "USER"

  @ApiProperty({ example: 'DRIVER', required: false })
  userType?: string; // Optional: Alias for roleName
}
