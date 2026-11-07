import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReserveStockItem {
  productId: string;
  productName?: string;
  quantity: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Concurrency-safe atomic inventory reservation.
   * Decrements available_quantity and increments reserved_quantity inside the caller's transaction.
   * Throws BadRequestException if stock is insufficient.
   */
  async reserveStockInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: ReserveStockItem[],
  ): Promise<void> {
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for product ${item.productId}`);
      }

      // 1. Atomic conditional update: only decrements if available_quantity >= quantity
      const rowsAffected = await tx.$executeRaw`
        UPDATE inventory.inventory
        SET available_quantity = available_quantity - ${item.quantity},
            reserved_quantity = reserved_quantity + ${item.quantity},
            updated_at = NOW()
        WHERE product_id = ${item.productId}::uuid AND available_quantity >= ${item.quantity}
      `;

      if (rowsAffected === 0) {
        // Find current stock to provide informative error
        const inv = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        const available = inv ? inv.availableQuantity : 0;
        const namePart = item.productName ? ` "${item.productName}"` : '';
        this.logger.warn(
          `Stock reservation failed for product${namePart} (${item.productId}): requested ${item.quantity}, available ${available}`,
        );

        throw new BadRequestException(
          `Insufficient stock for${namePart}. Available: ${available}, requested: ${item.quantity}`,
        );
      }

      // 2. Create reservation record
      await tx.inventoryReservation.create({
        data: {
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          status: ReservationStatus.CONFIRMED,
        },
      });

      this.logger.log(
        `Reserved ${item.quantity} units for order ${orderId}, product ${item.productId}`,
      );
    }
  }

  /**
   * Release reserved stock in case of order cancellation (for future lifecycle / compensation)
   */
  async releaseStockInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const reservations = await tx.inventoryReservation.findMany({
      where: {
        orderId,
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.CONFIRMED] },
      },
    });

    for (const res of reservations) {
      await tx.$executeRaw`
        UPDATE inventory.inventory
        SET available_quantity = available_quantity + ${res.quantity},
            reserved_quantity = GREATEST(0, reserved_quantity - ${res.quantity}),
            updated_at = NOW()
        WHERE product_id = ${res.productId}::uuid
      `;

      await tx.inventoryReservation.update({
        where: { id: res.id },
        data: { status: ReservationStatus.RELEASED },
      });
    }
  }
}
