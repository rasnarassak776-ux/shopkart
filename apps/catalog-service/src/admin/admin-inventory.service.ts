import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsoleActor } from '../products/products.service';

const PLATFORM_ACTOR: ConsoleActor = { id: '', role: UserRole.SUPERADMIN };

export interface AdminInventoryRow {
  productId: string;
  name: string;
  sku: string;
  brand: string | null;
  isActive: boolean;
  merchantId: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  updatedAt: Date;
}

/**
 * Merchant-scoped inventory views. Merchants manage stock only for products
 * they own; superadmins retain platform-wide access.
 */
@Injectable()
export class AdminInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(actor: ConsoleActor) {
    return actor.role === UserRole.SUPERADMIN ? {} : { merchantId: actor.id };
  }

  async list(actor: ConsoleActor = PLATFORM_ACTOR): Promise<AdminInventoryRow[]> {
    const products = await this.prisma.product.findMany({
      where: this.scopeWhere(actor),
      select: { id: true, name: true, sku: true, brand: true, isActive: true, merchantId: true },
      orderBy: { name: 'asc' },
    });
    if (products.length === 0) return [];

    const inventoryRows = await this.prisma.inventory.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
    });
    const byProduct = new Map(inventoryRows.map((row) => [row.productId, row]));

    return products.map((p) => {
      const inv = byProduct.get(p.id);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        isActive: p.isActive,
        merchantId: p.merchantId,
        availableQuantity: inv?.availableQuantity ?? 0,
        reservedQuantity: inv?.reservedQuantity ?? 0,
        updatedAt: inv?.updatedAt ?? new Date(0),
      };
    });
  }

  async updateAvailableQuantity(
    productId: string,
    availableQuantity: number,
    actor: ConsoleActor = PLATFORM_ACTOR,
  ): Promise<AdminInventoryRow> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, brand: true, isActive: true, merchantId: true },
    });
    if (
      !product ||
      (actor.role !== UserRole.SUPERADMIN && product.merchantId !== actor.id)
    ) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const inv = await this.prisma.inventory.upsert({
      where: { productId },
      create: { productId, availableQuantity, reservedQuantity: 0 },
      update: { availableQuantity },
    });

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      isActive: product.isActive,
      merchantId: product.merchantId,
      availableQuantity: inv.availableQuantity,
      reservedQuantity: inv.reservedQuantity,
      updatedAt: inv.updatedAt,
    };
  }
}
