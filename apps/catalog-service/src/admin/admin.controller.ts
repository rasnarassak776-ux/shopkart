import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@shopkart/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoriesService } from '../categories/categories.service';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import {
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from '../categories/dto/update-category.dto';
import { AdminStatsService } from './admin-stats.service';

/**
 * Catalog administration API. Every route requires a valid access token
 * (JwtAuthGuard) issued by the auth service AND the `admin` role (RolesGuard),
 * enforced at class level so no handler can be accidentally left open.
 */
@Controller('catalog/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly statsService: AdminStatsService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.statsService.getCatalogStats();
  }

  @Get('categories')
  async findAllCategories() {
    return this.categoriesService.findAllForAdmin();
  }

  @Get('categories/:id')
  async findCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findByIdForAdmin(id);
  }

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Patch('categories/:id/status')
  async updateCategoryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryStatusDto,
  ) {
    return this.categoriesService.setStatus(id, dto.isActive);
  }
}
