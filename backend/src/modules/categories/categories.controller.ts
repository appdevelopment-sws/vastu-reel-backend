import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './services/categories.service';
import { CategoryResponseDto } from './dto/category.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @ApiOperation({
    summary: 'Get all active categories with their nested subcategories',
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
}
