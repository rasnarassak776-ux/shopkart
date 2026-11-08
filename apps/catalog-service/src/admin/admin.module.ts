import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';

@Module({
  imports: [AuthModule, CategoriesModule],
  controllers: [AdminController],
  providers: [AdminStatsService],
})
export class AdminModule {}
