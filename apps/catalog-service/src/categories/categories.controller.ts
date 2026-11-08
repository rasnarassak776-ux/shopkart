import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('catalog/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Public storefront listing: active categories only. Inactive categories
   * are exposed exclusively through the admin-only `catalog/admin/categories`.
   */
  @Public()
  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findById(id);
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }
}
