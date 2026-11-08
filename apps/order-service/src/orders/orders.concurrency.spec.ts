import { BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';

describe('Member 3 – Phase 5: Inventory Atomic Concurrency Tests', () => {
  it('should prevent overselling when concurrent order requests compete for limited stock', async () => {
    // Simulated database state
    let availableQuantity = 2;
    let reservedQuantity = 0;
    const reservations: any[] = [];

    // Simulate PostgreSQL row-level lock and atomic conditional update:
    // UPDATE inventory SET available_quantity = available_quantity - $qty, reserved_quantity = reserved_quantity + $qty
    // WHERE product_id = $id AND available_quantity >= $qty
    const atomicDbUpdate = async (productId: string, quantity: number) => {
      // In PostgreSQL, row lock serializes the evaluation:
      if (availableQuantity >= quantity) {
        availableQuantity -= quantity;
        reservedQuantity += quantity;
        return 1; // 1 row updated
      }
      return 0; // 0 rows updated
    };

    const mockPrismaService: any = {
      $executeRaw: jest.fn(),
      inventory: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve({ availableQuantity, reservedQuantity }),
        ),
      },
      inventoryReservation: {
        create: jest.fn().mockImplementation(({ data }) => {
          reservations.push(data);
          return Promise.resolve({ id: 'res-' + reservations.length, ...data });
        }),
      },
    };

    const inventoryService = new InventoryService(mockPrismaService);

    // Simulate 5 concurrent orders each requesting 1 unit when only 2 units are available
    const orderAttempts = [1, 2, 3, 4, 5].map(async (orderIdx) => {
      const mockTx: any = {
        $executeRaw: jest.fn().mockImplementation(() => atomicDbUpdate('prod-uuid', 1)),
        inventory: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({ availableQuantity, reservedQuantity }),
          ),
        },
        inventoryReservation: {
          create: jest.fn().mockImplementation(({ data }) => {
            reservations.push(data);
            return Promise.resolve({ id: `res-${orderIdx}`, ...data });
          }),
        },
      };

      try {
        await inventoryService.reserveStockInTx(mockTx, `order-${orderIdx}`, [
          { productId: 'prod-uuid', productName: 'Limited Edition', quantity: 1 },
        ]);
        return { orderIdx, success: true };
      } catch (err: any) {
        return { orderIdx, success: false, error: err.message };
      }
    });

    const results = await Promise.all(orderAttempts);

    const successfulOrders = results.filter((r) => r.success);
    const failedOrders = results.filter((r) => !r.success);

    // Exactly 2 orders must succeed
    expect(successfulOrders.length).toBe(2);
    // Exactly 3 orders must fail due to insufficient stock
    expect(failedOrders.length).toBe(3);

    // Final available stock must be 0 and reserved must be 2
    expect(availableQuantity).toBe(0);
    expect(reservedQuantity).toBe(2);

    // Every failed order must receive informative insufficient stock error
    failedOrders.forEach((f) => {
      expect(f.error).toMatch(/Insufficient stock/);
    });
  });
});
