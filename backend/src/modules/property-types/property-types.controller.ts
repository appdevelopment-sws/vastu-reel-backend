import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PropertyTypesService } from './services/property-types.service';
import {
  PropertyTypeResponseDto,
  CreatePropertyTypeDto,
  UpdatePropertyTypeDto,
} from './dto/property-type.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Property Types')
@Controller('property-types')
export class PropertyTypesController {
  constructor(private readonly propertyTypesService: PropertyTypesService) {}

  @Public()
  @ApiOperation({
    summary: 'Get all active property types (Mobile App & Reel Upload)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active property types.',
    type: [PropertyTypeResponseDto],
  })
  @Get()
  async getPropertyTypes() {
    return this.propertyTypesService.findAll();
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Get all property types with linked reels count (Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Full list of property types with reel stats.',
  })
  @Get('admin')
  async getPropertyTypesAdmin() {
    return this.propertyTypesService.findAllAdmin();
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new property type (Admin)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Property type created successfully.',
    type: PropertyTypeResponseDto,
  })
  @Post()
  async createPropertyType(@Body() dto: CreatePropertyTypeDto) {
    return this.propertyTypesService.create(dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an existing property type (Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Property type updated successfully.',
    type: PropertyTypeResponseDto,
  })
  @Put(':id')
  async updatePropertyType(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyTypeDto,
  ) {
    return this.propertyTypesService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Delete or deactivate property type with video links check (Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Property type deleted permanently or safely deactivated if linked to reels.',
  })
  @Delete(':id')
  async deletePropertyType(@Param('id') id: string) {
    return this.propertyTypesService.delete(id);
  }
}
