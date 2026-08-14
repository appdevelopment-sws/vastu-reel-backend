import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'test@gmail.com',
  })
  email: string;
  @ApiProperty({
    example: 'asdfghjkl',
  })
  password: string;

  @ApiProperty({
    example: 'DRIVER',
    required: false,
    description: 'Expected user role type (e.g. USER, DRIVER, SUPER_ADMIN)',
  })
  userType?: string;
}
