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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@shopkart/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CategoriesService } from '../categories/categories.service';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import {
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from '../categories/dto/update-category.dto';
import { AdminStatsService } from './admin-stats.service';
import { AdminInventoryService } from './admin-inventory.service';
import { InventoryQueryDto, StockAdjustmentDto, LowStockThresholdDto, StockHistoryQueryDto } from './dto/inventory.dto';
import { ProductsService, ConsoleActor } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import {
  UpdateProductDto,
  UpdateProductStatusDto,
} from '../products/dto/update-product.dto';
import { QueryAdminProductsDto } from '../products/dto/query-admin-products.dto';
import {
  MAX_IMAGE_FILE_SIZE,
  MAX_IMAGES_PER_REQUEST,
} from '../storage/file-validation';

interface RequestUser {
  id: string;
  role: string;
}

const toActor = (user: RequestUser): ConsoleActor => ({ id: user.id, role: user.role });

/**
 * Catalog administration API. Every route requires a valid access token
 * (JwtAuthGuard) issued by the auth service AND the `merchant` or `superadmin`
 * role (RolesGuard), enforced at class level so no handler can be accidentally
 * left open. Merchants are additionally scoped to their own products by the
 * service layer; superadmins retain platform-wide access.
 */
@Controller('catalog/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
export class AdminController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly statsService: AdminStatsService,
    private readonly inventoryService: AdminInventoryService,
    private readonly productsService: ProductsService,
  ) {}

  // ---------------- Stats ----------------

  @Get('stats')
  async getStats(@CurrentUser() user: RequestUser) {
    return this.statsService.getCatalogStats(toActor(user));
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
  async findAllProducts(
    @Query() query: QueryAdminProductsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.findAllForAdmin(query, toActor(user));
  }

  @Get('products/:id')
  async findProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.findByIdForAdmin(id, toActor(user));
  }

  @Post('products')
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.create(dto, toActor(user));
  }

  @Patch('products/:id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.update(id, dto, toActor(user));
  }

  @Patch('products/:id/status')
  async updateProductStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.setStatus(id, dto.isActive, toActor(user));
  }

  @Delete('products/:id')
  async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.delete(id, toActor(user));
  }

  // ---------------- Product Images ----------------

  @Post('products/:id/images')
  @UseInterceptors(
    FilesInterceptor('files', MAX_IMAGES_PER_REQUEST, {
      limits: { fileSize: MAX_IMAGE_FILE_SIZE },
    }),
  )
  async uploadProductImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Array<{
      buffer?: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    }>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.uploadImages(id, files || [], toActor(user));
  }

  @Delete('products/:id/images/:imageId')
  async deleteProductImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.deleteImage(id, imageId, toActor(user));
  }

  @Patch('products/:id/images/:imageId/primary')
  async setPrimaryProductImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.productsService.setPrimaryImage(id, imageId, toActor(user));
  }

  // ---------------- Inventory ----------------

  @Get('inventory')
  async listInventory(@Query() query: InventoryQueryDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.list(toActor(user), query);
  }

  @Get('inventory/history')
  async inventoryHistory(@Query() query: StockHistoryQueryDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.history(toActor(user), query);
  }

  @Post('inventory/:productId/increase')
  async increaseInventory(@Param('productId', ParseUUIDPipe) productId: string, @Body() dto: StockAdjustmentDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.increaseStock(productId, dto, toActor(user));
  }

  @Post('inventory/:productId/decrease')
  async decreaseInventory(@Param('productId', ParseUUIDPipe) productId: string, @Body() dto: StockAdjustmentDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.decreaseStock(productId, dto, toActor(user));
  }

  @Post('inventory/:productId/adjust')
  async adjustInventory(@Param('productId', ParseUUIDPipe) productId: string, @Body() dto: StockAdjustmentDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.manualAdjustment(productId, dto, toActor(user));
  }

  @Patch('inventory/:productId/threshold')
  async updateInventoryThreshold(@Param('productId', ParseUUIDPipe) productId: string, @Body() dto: LowStockThresholdDto, @CurrentUser() user: RequestUser) {
    return this.inventoryService.updateThreshold(productId, dto, toActor(user));
  }
}
