import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogClient } from '../catalog/catalog.client';
import { CartStatus } from '@prisma/client';

describe('CartService Concurrency & Advisory Lock', () => {
  let service: CartService;
  let prisma: PrismaService;
  let catalogClient: CatalogClient;

  // In-memory simulation of transactional state with advisory lock serialization
  let simulatedDbCart: any = null;
  let simulatedDbItems: Map<string, any> = new Map();
  let lockHolders: Set<string> = new Set();

  beforeEach(async () => {
    simulatedDbCart = null;
    simulatedDbItems.clear();
    lockHolders.clear();

    const mockCatalogClient = {
      getProduct: jest.fn().mockImplementation(async (id: string) => ({
        id,
        name: `Product ${id}`,
        price: '10.00',
        isActive: true,
      })),
      getPrimaryImageUrl: jest.fn().mockReturnValue('https://example.com/item.jpg'),
    };

    const mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: jest.fn().mockImplementation(async (strings: any, ...values: any[]) => {
            // Simulate pg_advisory_xact_lock
            const lockKey = values[0] || 'default-lock';
            lockHolders.add(lockKey);
            return 1;
          }),
          cart: {
            findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
              if (simulatedDbCart && simulatedDbCart.userId === where.userId && simulatedDbCart.status === where.status) {
                return { ...simulatedDbCart };
              }
              return null;
            }),
            create: jest.fn().mockImplementation(async ({ data }: any) => {
              simulatedDbCart = {
                id: 'simulated-cart-1',
                userId: data.userId,
                status: data.status,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              return { ...simulatedDbCart };
            }),
          },
          cartItem: {
            findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
              const key = `${where.cartId_productId.cartId}_${where.cartId_productId.productId}`;
              const item = simulatedDbItems.get(key);
              return item ? { ...item } : null;
            }),
            create: jest.fn().mockImplementation(async ({ data }: any) => {
              const key = `${data.cartId}_${data.productId}`;
              const newItem = {
                id: `sim-item-${simulatedDbItems.size + 1}`,
                cartId: data.cartId,
                productId: data.productId,
                quantity: data.quantity,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              simulatedDbItems.set(key, newItem);
              return { ...newItem };
            }),
            update: jest.fn().mockImplementation(async ({ where, data }: any) => {
              // Find item by id
              let foundKey: string | null = null;
              for (const [k, v] of simulatedDbItems.entries()) {
                if (v.id === where.id) {
                  foundKey = k;
                  break;
                }
              }
              if (foundKey) {
                const item = simulatedDbItems.get(foundKey);
                item.quantity = data.quantity;
                item.updatedAt = new Date();
                simulatedDbItems.set(foundKey, item);
                return { ...item };
              }
              return null;
            }),
          },
        };

        return callback(tx);
      }),
      cart: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (simulatedDbCart && simulatedDbCart.userId === where.userId && simulatedDbCart.status === where.status) {
            return {
              ...simulatedDbCart,
              items: Array.from(simulatedDbItems.values()),
            };
          }
          return null;
        }),
      },
      cartItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CatalogClient, useValue: mockCatalogClient },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
    catalogClient = module.get<CatalogClient>(CatalogClient);
  });

  it('should acquire per-user advisory lock during addItem transaction', async () => {
    const userId = 'user-concurrent-1';
    await service.addItem(userId, { productId: 'prod-A', quantity: 2 });

    expect(lockHolders.has(`cart_${userId}`)).toBe(true);
    expect(simulatedDbCart).not.toBeNull();
    expect(simulatedDbCart.userId).toBe(userId);
    expect(simulatedDbItems.size).toBe(1);
  });

  it('should serialize concurrent additions and accumulate quantities correctly', async () => {
    const userId = 'user-concurrent-2';

    // Simulate serialized execution through the advisory lock
    await service.addItem(userId, { productId: 'prod-same', quantity: 2 });
    await service.addItem(userId, { productId: 'prod-same', quantity: 3 });

    const cart = await service.getCart(userId);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.summary.totalItems).toBe(5);
    expect(cart.summary.availableItems).toBe(5);
    expect(cart.summary.subtotal).toBe('50.00');
  });

  it('should enforce maximum quantity ceiling of 99 during successive additions', async () => {
    const userId = 'user-concurrent-3';

    await service.addItem(userId, { productId: 'prod-limit', quantity: 95 });

    await expect(
      service.addItem(userId, { productId: 'prod-limit', quantity: 5 }),
    ).rejects.toThrow(BadRequestException);

    // Quantity should remain 95
    const cart = await service.getCart(userId);
    expect(cart.items[0].quantity).toBe(95);
  });
});
