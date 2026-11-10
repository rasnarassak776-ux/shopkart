import { Injectable } from '@nestjs/common';
import { UserRole } from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsoleActor } from '../products/products.service';

const PLATFORM_ACTOR: ConsoleActor = { id: '', role: UserRole.SUPERADMIN };

export interface CatalogAdminStats {
  products: { total: number; active: number; inactive: number };
  categories: { total: number; active: number; inactive: number };
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogStats(actor: ConsoleActor = PLATFORM_ACTOR): Promise<CatalogAdminStats> {
    // Merchants only see stats for their own products; superadmins see the platform totals.
    const productScope =
      actor.role === UserRole.SUPERADMIN ? {} : { merchantId: actor.id };

    const [totalProducts, activeProducts, totalCategories, activeCategories] =
      await this.prisma.$transaction([
        this.prisma.product.count({ where: productScope }),
        this.prisma.product.count({ where: { ...productScope, isActive: true } }),
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
