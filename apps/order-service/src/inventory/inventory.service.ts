import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus, Prisma, ReservationStatus, StockMovementAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReserveStockItem {
  productId: string;
  productName?: string;
  quantity: number;
  merchantId?: string | null;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async applyStockChange(
    tx: Prisma.TransactionClient,
    params: {
      productId: string;
      previousQuantity: number;
      newQuantity: number;
      quantityChanged: number;
      actionType: StockMovementAction;
      reason?: string;
      userId?: string | null;
      merchantId?: string | null;
    },
  ) {
    const inventory = await tx.inventory.findUnique({ where: { productId: params.productId } });
    const threshold = inventory?.lowStockThreshold ?? 0;
    const wasAlerted = Boolean(inventory?.lowStockAlertedAt);
    const isLow = threshold > 0 && params.newQuantity <= threshold;
    const alertedAt = isLow ? (inventory?.lowStockAlertedAt ?? new Date()) : null;

    if (inventory) {
      await tx.inventory.update({ where: { productId: params.productId }, data: { lowStockAlertedAt: alertedAt } });
    }
    await tx.product.update({ where: { id: params.productId }, data: { outOfStock: params.newQuantity <= 0 } });
    await tx.stockMovement.create({ data: {
      productId: params.productId,
      merchantId: params.merchantId ?? null,
      previousQuantity: params.previousQuantity,
      quantityChanged: params.quantityChanged,
      newQuantity: params.newQuantity,
      actionType: params.actionType,
      reason: params.reason ?? null,
      userId: params.userId ?? null,
    }});

    if (isLow && !wasAlerted && params.merchantId) {
      const product = await tx.product.findUnique({ where: { id: params.productId }, select: { name: true } });
      await tx.notification.create({ data: {
        userId: params.merchantId,
        type: 'LOW_STOCK_ALERT',
        title: 'Low stock alert',
        message: `"${product?.name ?? params.productId}" is low on stock (${params.newQuantity} available; threshold ${threshold}).`,
        channel: 'IN_APP',
        recipient: params.merchantId,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        metadata: { productId: params.productId, availableQuantity: params.newQuantity, lowStockThreshold: threshold },
      }});
    }
  }

  async reserveStockInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: ReserveStockItem[],
    actorUserId?: string,
  ): Promise<void> {
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for product ${item.productId}`);
      }

      const rowsAffected = await tx.$executeRaw`
        UPDATE inventory.inventory
        SET available_quantity = available_quantity - ${item.quantity},
            reserved_quantity = reserved_quantity + ${item.quantity},
            updated_at = NOW()
        WHERE product_id = ${item.productId}::uuid AND available_quantity >= ${item.quantity}
      `;

      if (rowsAffected === 0) {
        const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
        const available = inv ? inv.availableQuantity : 0;
        const namePart = item.productName ? ` "${item.productName}"` : '';
        this.logger.warn(`Stock reservation failed for product${namePart} (${item.productId}): requested ${item.quantity}, available ${available}`);
        throw new BadRequestException(`Insufficient stock for${namePart}. Available: ${available}, requested: ${item.quantity}`);
      }

      const updatedInventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
      const newQuantity = updatedInventory?.availableQuantity ?? 0;
      await tx.inventoryReservation.create({ data: {
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        status: ReservationStatus.CONFIRMED,
      }});
      await this.applyStockChange(tx, {
        productId: item.productId,
        previousQuantity: newQuantity + item.quantity,
        newQuantity,
        quantityChanged: -item.quantity,
        actionType: StockMovementAction.ORDER_RESERVED,
        reason: `Order ${orderId}`,
        userId: actorUserId ?? null,
        merchantId: item.merchantId ?? null,
      });
      this.logger.log(`Reserved ${item.quantity} units for order ${orderId}, product ${item.productId}`);
    }
  }

  async releaseStockInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    actorUserId?: string,
    reason?: string,
  ): Promise<void> {
    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, status: { in: [ReservationStatus.RESERVED, ReservationStatus.CONFIRMED] } },
    });

    for (const res of reservations) {
      const before = await tx.inventory.findUnique({ where: { productId: res.productId } });
      const previousQuantity = before?.availableQuantity ?? 0;
      await tx.$executeRaw`
        UPDATE inventory.inventory
        SET available_quantity = available_quantity + ${res.quantity},
            reserved_quantity = GREATEST(0, reserved_quantity - ${res.quantity}),
            updated_at = NOW()
        WHERE product_id = ${res.productId}::uuid
      `;
      const after = await tx.inventory.findUnique({ where: { productId: res.productId } });
      const newQuantity = after?.availableQuantity ?? previousQuantity + res.quantity;
      const product = await tx.product.findUnique({ where: { id: res.productId }, select: { merchantId: true } });
      await tx.inventoryReservation.update({ where: { id: res.id }, data: { status: ReservationStatus.RELEASED } });
      await this.applyStockChange(tx, {
        productId: res.productId,
        previousQuantity,
        newQuantity,
        quantityChanged: res.quantity,
        actionType: StockMovementAction.ORDER_CANCELLED,
        reason: reason ?? `Order ${orderId} cancellation`,
        userId: actorUserId ?? null,
        merchantId: product?.merchantId ?? null,
      });
    }
  }

  async releaseStockForItemsInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    productIds: string[],
    actorUserId?: string,
    reason?: string,
  ): Promise<void> {
    if (!productIds || productIds.length === 0) return;

    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, productId: { in: productIds }, status: { in: [ReservationStatus.RESERVED, ReservationStatus.CONFIRMED] } },
    });

    for (const res of reservations) {
      const before = await tx.inventory.findUnique({ where: { productId: res.productId } });
      const previousQuantity = before?.availableQuantity ?? 0;
      await tx.$executeRaw`
        UPDATE inventory.inventory
        SET available_quantity = available_quantity + ${res.quantity},
            reserved_quantity = GREATEST(0, reserved_quantity - ${res.quantity}),
            updated_at = NOW()
        WHERE product_id = ${res.productId}::uuid
      `;
      const after = await tx.inventory.findUnique({ where: { productId: res.productId } });
      const newQuantity = after?.availableQuantity ?? previousQuantity + res.quantity;
      const product = await tx.product.findUnique({ where: { id: res.productId }, select: { merchantId: true } });
      await tx.inventoryReservation.update({ where: { id: res.id }, data: { status: ReservationStatus.RELEASED } });
      await this.applyStockChange(tx, {
        productId: res.productId,
        previousQuantity,
        newQuantity,
        quantityChanged: res.quantity,
        actionType: StockMovementAction.ORDER_CANCELLED,
        reason: reason ?? `Order ${orderId} item cancellation`,
        userId: actorUserId ?? null,
        merchantId: product?.merchantId ?? null,
      });
      this.logger.log(`Released ${res.quantity} units for order ${orderId}, product ${res.productId}`);
    }
  }
}
