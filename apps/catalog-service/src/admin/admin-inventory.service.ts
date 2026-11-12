import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus, Prisma, StockMovementAction } from '@prisma/client';
import { UserRole } from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsoleActor } from '../products/products.service';
import { InventoryQueryDto, StockAdjustmentDto, LowStockThresholdDto, StockHistoryQueryDto } from './dto/inventory.dto';

const PLATFORM_ACTOR: ConsoleActor = { id: '', role: UserRole.SUPERADMIN };

export interface AdminInventoryRow {
  productId: string;
  name: string;
  sku: string;
  brand: string | null;
  imageUrl: string | null;
  isActive: boolean;
  outOfStock: boolean;
  merchantId: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
  updatedAt: Date;
}

function stockStatus(row: { availableQuantity: number; lowStockThreshold: number; outOfStock: boolean }): AdminInventoryRow['stockStatus'] {
  if (row.outOfStock || row.availableQuantity <= 0) return 'OUT_OF_STOCK';
  if (row.lowStockThreshold > 0 && row.availableQuantity <= row.lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

@Injectable()
export class AdminInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(actor: ConsoleActor) {
    return actor.role === UserRole.SUPERADMIN ? {} : { merchantId: actor.id };
  }

  private async manageableProductOrThrow(productId: string, actor: ConsoleActor) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, brand: true, isActive: true, outOfStock: true, merchantId: true },
    });
    if (!product || (actor.role !== UserRole.SUPERADMIN && product.merchantId !== actor.id)) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }
    return product;
  }

  private async rowsForProducts(products: Array<{ id: string; name: string; sku: string; brand: string | null; isActive: boolean; outOfStock: boolean; merchantId: string | null; images: Array<{ imageUrl: string; isPrimary: boolean }> }>) {
    if (products.length === 0) return [];
    const inventoryRows = await this.prisma.inventory.findMany({ where: { productId: { in: products.map((p) => p.id) } } });
    const byProduct = new Map(inventoryRows.map((row) => [row.productId, row]));
    return products.map((p) => {
      const inv = byProduct.get(p.id);
      const availableQuantity = inv?.availableQuantity ?? 0;
      const lowStockThreshold = inv?.lowStockThreshold ?? 0;
      const outOfStock = p.outOfStock || availableQuantity <= 0;
      const row = { availableQuantity, lowStockThreshold, outOfStock };
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        imageUrl: p.images.find((i) => i.isPrimary)?.imageUrl ?? p.images[0]?.imageUrl ?? null,
        isActive: p.isActive,
        outOfStock,
        merchantId: p.merchantId,
        availableQuantity,
        reservedQuantity: inv?.reservedQuantity ?? 0,
        lowStockThreshold,
        stockStatus: stockStatus(row),
        updatedAt: inv?.updatedAt ?? new Date(0),
      } satisfies AdminInventoryRow;
    });
  }

  async list(actor: ConsoleActor = PLATFORM_ACTOR, query: InventoryQueryDto = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const isSuperadmin = actor.role === UserRole.SUPERADMIN;
    const where: Prisma.ProductWhereInput = {
      ...this.scopeWhere(actor),
      ...(isSuperadmin && query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, brand: true, isActive: true, outOfStock: true, merchantId: true, images: { select: { imageUrl: true, isPrimary: true }, orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }], take: 1 } },
      orderBy: { name: 'asc' },
    });
    let rows = await this.rowsForProducts(products);

    const summary = {
      totalProducts: rows.length,
      inStock: rows.filter((r) => r.stockStatus === 'IN_STOCK').length,
      lowStock: rows.filter((r) => r.stockStatus === 'LOW_STOCK').length,
      outOfStock: rows.filter((r) => r.stockStatus === 'OUT_OF_STOCK').length,
    };

    const statusMap: Record<string, AdminInventoryRow['stockStatus']> = {
      in_stock: 'IN_STOCK',
      low_stock: 'LOW_STOCK',
      out_of_stock: 'OUT_OF_STOCK',
    };
    if (query.status && query.status !== 'all') {
      const wanted = statusMap[query.status];
      if (wanted) rows = rows.filter((r) => r.stockStatus === wanted);
    }

    const total = rows.length;
    const data = rows.slice((page - 1) * limit, page * limit);
    return { data, summary, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async increaseStock(productId: string, dto: StockAdjustmentDto, actor: ConsoleActor = PLATFORM_ACTOR) {
    return this.adjustStock(productId, dto, actor, StockMovementAction.STOCK_ADDED, true);
  }

  async decreaseStock(productId: string, dto: StockAdjustmentDto, actor: ConsoleActor = PLATFORM_ACTOR) {
    return this.adjustStock(productId, dto, actor, StockMovementAction.STOCK_REDUCED, false);
  }

  async manualAdjustment(productId: string, dto: StockAdjustmentDto, actor: ConsoleActor = PLATFORM_ACTOR) {
    return this.adjustStock(productId, dto, actor, StockMovementAction.MANUAL_ADJUSTMENT, null);
  }

  private async adjustStock(productId: string, dto: StockAdjustmentDto, actor: ConsoleActor, actionType: StockMovementAction, direction: boolean | null) {
    const product = await this.manageableProductOrThrow(productId, actor);
    const delta = direction === true ? (dto.quantity ?? 0) : direction === false ? -(dto.quantity ?? 0) : (dto.quantityDelta ?? 0);
    if (!Number.isInteger(delta) || delta === 0) throw new BadRequestException('A non-zero integer stock quantity is required');
    if (direction !== null && (dto.quantity === undefined || dto.quantity <= 0)) throw new BadRequestException('quantity must be a positive integer');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({ where: { productId } });
      const previousQuantity = existing?.availableQuantity ?? 0;
      const newQuantity = previousQuantity + delta;
      if (newQuantity < 0) throw new BadRequestException(`Insufficient stock. Available: ${previousQuantity}, requested reduction: ${Math.abs(delta)}`);
      const threshold = existing?.lowStockThreshold ?? 0;
      const wasAlerted = Boolean(existing?.lowStockAlertedAt);
      const isLow = threshold > 0 && newQuantity <= threshold;
      const shouldAlert = isLow && !wasAlerted;
      const alertedAt = isLow ? (existing?.lowStockAlertedAt ?? new Date()) : null;

      const effectiveAction = !existing && newQuantity > 0 ? StockMovementAction.INITIAL_STOCK : actionType;
      const inventory = await tx.inventory.upsert({
        where: { productId },
        create: { productId, availableQuantity: newQuantity, reservedQuantity: 0, lowStockThreshold: threshold, lowStockAlertedAt: alertedAt },
        update: { availableQuantity: newQuantity, lowStockAlertedAt: alertedAt },
      });
      await tx.product.update({ where: { id: productId }, data: { outOfStock: newQuantity <= 0 } });
      await tx.stockMovement.create({ data: {
        productId, merchantId: product.merchantId, previousQuantity, quantityChanged: delta, newQuantity,
        actionType: effectiveAction, reason: dto.reason.trim(), userId: actor.id || null,
      }});
      if (shouldAlert && product.merchantId) {
        await tx.notification.create({ data: {
          userId: product.merchantId, type: 'LOW_STOCK_ALERT', title: 'Low stock alert',
          message: `"${product.name}" is low on stock (${newQuantity} available; threshold ${threshold}).`,
          channel: 'IN_APP', recipient: product.merchantId, status: NotificationStatus.SENT, sentAt: new Date(),
          metadata: { productId, availableQuantity: newQuantity, lowStockThreshold: threshold },
        }});
      }
      return this.inventoryRow(tx, productId, product, inventory.updatedAt);
    });
  }

  async updateThreshold(productId: string, dto: LowStockThresholdDto, actor: ConsoleActor = PLATFORM_ACTOR) {
    const product = await this.manageableProductOrThrow(productId, actor);
    const inventory = await this.prisma.inventory.upsert({
      where: { productId },
      create: { productId, availableQuantity: 0, reservedQuantity: 0, lowStockThreshold: dto.lowStockThreshold },
      update: { lowStockThreshold: dto.lowStockThreshold },
    });
    const isLow = inventory.lowStockThreshold > 0 && inventory.availableQuantity <= inventory.lowStockThreshold;
    if (!isLow && inventory.lowStockAlertedAt) {
      await this.prisma.inventory.update({ where: { productId }, data: { lowStockAlertedAt: null } });
    }
    return this.inventoryRow(this.prisma, productId, product, inventory.updatedAt);
  }

  async history(actor: ConsoleActor = PLATFORM_ACTOR, query: StockHistoryQueryDto = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Prisma.StockMovementWhereInput = {
      ...(actor.role !== UserRole.SUPERADMIN ? { merchantId: actor.id } : query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.stockMovement.count({ where }),
    ]);
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const products = productIds.length ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true, merchantId: true } }) : [];
    const productById = new Map(products.map((p) => [p.id, p]));
    return {
      data: rows.map((r) => ({ ...r, product: productById.get(r.productId) ?? null })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  private async inventoryRow(client: Prisma.TransactionClient | PrismaService, productId: string, product: { id: string; name: string; sku: string; brand: string | null; isActive: boolean; outOfStock: boolean; merchantId: string | null }, updatedAt: Date) {
    const inv = await client.inventory.findUnique({ where: { productId } });
    const availableQuantity = inv?.availableQuantity ?? 0;
    const lowStockThreshold = inv?.lowStockThreshold ?? 0;
    const outOfStock = availableQuantity <= 0;
    return {
      productId, name: product.name, sku: product.sku, brand: product.brand, imageUrl: null,
      isActive: product.isActive, outOfStock, merchantId: product.merchantId,
      availableQuantity, reservedQuantity: inv?.reservedQuantity ?? 0, lowStockThreshold,
      stockStatus: stockStatus({ availableQuantity, lowStockThreshold, outOfStock }), updatedAt,
    };
  }
}
