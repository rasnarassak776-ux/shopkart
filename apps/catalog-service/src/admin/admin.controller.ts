import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import {
  UpdateProductDto,
  UpdateProductStatusDto,
} from '../products/dto/update-product.dto';
import { QueryAdminProductsDto } from '../products/dto/query-admin-products.dto';

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
    private readonly productsService: ProductsService,
  ) {}

  // ---------------- Stats ----------------

  @Get('stats')
  async getStats() {
    return this.statsService.getCatalogStats();
  }

  // ---------------- Categories ----------------

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

  // ---------------- Products ----------------

  @Get('products')
  async findAllProducts(@Query() query: QueryAdminProductsDto) {
    return this.productsService.findAllForAdmin(query);
  }

  @Get('products/:id')
  async findProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findByIdForAdmin(id);
  }

  @Post('products')
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch('products/:id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Patch('products/:id/status')
  async updateProductStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.productsService.setStatus(id, dto.isActive);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.delete(id);
  }
}
