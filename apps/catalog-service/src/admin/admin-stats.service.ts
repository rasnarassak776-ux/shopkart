import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CatalogAdminStats {
  products: { total: number; active: number; inactive: number };
  categories: { total: number; active: number; inactive: number };
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogStats(): Promise<CatalogAdminStats> {
    const [totalProducts, activeProducts, totalCategories, activeCategories] =
      await this.prisma.$transaction([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.category.count(),
        this.prisma.category.count({ where: { isActive: true } }),
      ]);

    return {
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },
      categories: {
        total: totalCategories,
        active: activeCategories,
        inactive: totalCategories - activeCategories,
      },
    };
  }
}
