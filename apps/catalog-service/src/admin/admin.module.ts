import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { StorageModule } from '../storage/storage.module';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';

@Module({
  imports: [AuthModule, CategoriesModule, ProductsModule, StorageModule],
  controllers: [AdminController],
  providers: [AdminStatsService],
})
export class AdminModule {}
