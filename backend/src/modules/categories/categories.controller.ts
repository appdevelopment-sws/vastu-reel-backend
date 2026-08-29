import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './services/categories.service';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
} from './dto/category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @ApiOperation({
    summary: 'Get all active categories with their nested subcategories (Mobile App)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active categories with nested subcategories.',
    type: [CategoryResponseDto],
  })
  @Get()
  async getCategories() {
    return this.categoriesService.findAll();
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Get all categories with subcategories and linked reels count (Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Full list of categories with reel stats and subcategories.',
  })
  @Get('admin')
  async getCategoriesAdmin() {
    return this.categoriesService.findAllAdmin();
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new category (Admin)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully.',
  })
  @Post()
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an existing category (Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully.',
  })
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Delete or deactivate category with video links check (Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted permanently or safely deactivated if linked to reels.',
  })
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new subcategory for category (Admin)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subcategory created successfully.',
  })
  @Post(':id/sub-categories')
  async createSubCategory(
    @Param('id') categoryId: string,
    @Body() dto: CreateSubCategoryDto,
  ) {
    return this.categoriesService.createSubCategory(categoryId, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an existing subcategory (Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subcategory updated successfully.',
  })
  @Put('sub-categories/:subId')
  async updateSubCategory(
    @Param('subId') subId: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.categoriesService.updateSubCategory(subId, dto);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Delete or deactivate subcategory with video links check (Admin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subcategory deleted permanently or safely deactivated if linked to reels.',
  })
  @Delete('sub-categories/:subId')
  async deleteSubCategory(@Param('subId') subId: string) {
    return this.categoriesService.deleteSubCategory(subId);
  }
}
