import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationStatus, StockMovementAction } from '@prisma/client';
import { UserRole } from '@shopkart/common';
import { AdminInventoryService } from './admin-inventory.service';
import { PrismaService } from '../prisma/prisma.service';

const merchant = { id: 'merchant-1', role: UserRole.MERCHANT };
const otherMerchant = { id: 'merchant-2', role: UserRole.MERCHANT };
const superadmin = { id: 'admin-1', role: UserRole.SUPERADMIN };

const product = {
  id: 'prod-1', name: 'Keyboard', sku: 'KB-1', brand: 'Acme', isActive: true,
  outOfStock: true, merchantId: 'merchant-1',
};

function makeTx() {
  return {
    inventory: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    product: { update: jest.fn() },
    stockMovement: { create: jest.fn() },
    notification: { create: jest.fn() },
  };
}

describe('AdminInventoryService', () => {
  let service: AdminInventoryService;
  let prisma: {
    product: { findUnique: jest.Mock; findMany: jest.Mock };
    inventory: { findMany: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock };
    stockMovement: { findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn(), findMany: jest.fn() },
      inventory: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
      stockMovement: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(makeTx())),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminInventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AdminInventoryService);
    jest.clearAllMocks();
  });

  function setupOwnedProduct() {
    prisma.product.findUnique.mockResolvedValue(product);
  }

  it('lets a merchant increase stock for an own product and records history', async () => {
    setupOwnedProduct();
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.inventory.findUnique
      .mockResolvedValueOnce({ productId: 'prod-1', availableQuantity: 2, reservedQuantity: 0, lowStockThreshold: 5, lowStockAlertedAt: null })
      .mockResolvedValue({ productId: 'prod-1', availableQuantity: 7, reservedQuantity: 0, lowStockThreshold: 5, lowStockAlertedAt: null });
    tx.inventory.upsert.mockResolvedValue({ availableQuantity: 7, reservedQuantity: 0, lowStockThreshold: 5, updatedAt: new Date() });

    const result = await service.increaseStock('prod-1', { quantity: 5, reason: 'New shipment' }, merchant);

    expect(tx.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ availableQuantity: 7 }) }));
    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'prod-1' }, data: { outOfStock: false } });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      productId: 'prod-1', merchantId: 'merchant-1', previousQuantity: 2, quantityChanged: 5, newQuantity: 7,
      actionType: StockMovementAction.STOCK_ADDED, reason: 'New shipment', userId: 'merchant-1',
    })});
    expect(result.availableQuantity).toBe(7);
    expect(result.stockStatus).toBe('IN_STOCK');
  });

  it('lets a merchant decrease stock but rejects negative quantities', async () => {
    setupOwnedProduct();
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.inventory.findUnique
      .mockResolvedValueOnce({ productId: 'prod-1', availableQuantity: 3, reservedQuantity: 0, lowStockThreshold: 0, lowStockAlertedAt: null })
      .mockResolvedValue({ productId: 'prod-1', availableQuantity: 1, reservedQuantity: 0, lowStockThreshold: 0, lowStockAlertedAt: null });
    tx.inventory.upsert.mockResolvedValue({ availableQuantity: 1, reservedQuantity: 0, lowStockThreshold: 0, updatedAt: new Date() });

    const result = await service.decreaseStock('prod-1', { quantity: 2, reason: 'Damaged units' }, merchant);
    expect(result.availableQuantity).toBe(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ quantityChanged: -2, actionType: StockMovementAction.STOCK_REDUCED })});

    tx.inventory.findUnique.mockResolvedValue({ productId: 'prod-1', availableQuantity: 1, reservedQuantity: 0, lowStockThreshold: 0, lowStockAlertedAt: null });
    await expect(service.decreaseStock('prod-1', { quantity: 5, reason: 'Too many' }, merchant)).rejects.toThrow(BadRequestException);
  });

  it('prevents merchants from modifying another merchant product', async () => {
    prisma.product.findUnique.mockResolvedValue({ ...product, merchantId: 'merchant-2' });
    await expect(service.increaseStock('prod-1', { quantity: 1, reason: 'x' }, merchant)).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not duplicate low-stock alerts while stock remains low', async () => {
    setupOwnedProduct();
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.inventory.findUnique.mockResolvedValue({ productId: 'prod-1', availableQuantity: 2, reservedQuantity: 0, lowStockThreshold: 5, lowStockAlertedAt: new Date() });
    tx.inventory.upsert.mockResolvedValue({ availableQuantity: 3, reservedQuantity: 0, lowStockThreshold: 5, updatedAt: new Date() });

    await service.increaseStock('prod-1', { quantity: 1, reason: 'Restock partial' }, merchant);
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('creates one low-stock notification when crossing into low stock', async () => {
    setupOwnedProduct();
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.inventory.findUnique.mockResolvedValue({ productId: 'prod-1', availableQuantity: 6, reservedQuantity: 0, lowStockThreshold: 5, lowStockAlertedAt: null });
    tx.inventory.upsert.mockResolvedValue({ availableQuantity: 5, reservedQuantity: 0, lowStockThreshold: 5, updatedAt: new Date() });

    await service.decreaseStock('prod-1', { quantity: 1, reason: 'Correction' }, merchant);
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: 'merchant-1', type: 'LOW_STOCK_ALERT', status: NotificationStatus.SENT,
    })});
  });

  it('lets superadmin view inventory across merchants and record audited adjustments', async () => {
    prisma.product.findMany.mockResolvedValue([{ ...product, outOfStock: false, images: [] }, { ...product, id: 'prod-2', merchantId: 'merchant-2', images: [] }]);
    prisma.inventory.findMany.mockResolvedValue([
      { productId: 'prod-1', availableQuantity: 2, reservedQuantity: 1, lowStockThreshold: 5, updatedAt: new Date() },
      { productId: 'prod-2', availableQuantity: 0, reservedQuantity: 0, lowStockThreshold: 0, updatedAt: new Date() },
    ]);
    const list = await service.list(superadmin, {});
    expect(list.summary.totalProducts).toBe(2);
    expect(list.summary.lowStock).toBe(1);
    expect(list.summary.outOfStock).toBe(1);

    prisma.product.findUnique.mockResolvedValue({ ...product, merchantId: 'merchant-2' });
    const tx = makeTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    tx.inventory.findUnique.mockResolvedValue({ productId: 'prod-1', availableQuantity: 1, reservedQuantity: 0, lowStockThreshold: 0, lowStockAlertedAt: null });
    tx.inventory.upsert.mockResolvedValue({ availableQuantity: 4, reservedQuantity: 0, lowStockThreshold: 0, updatedAt: new Date() });
    await service.manualAdjustment('prod-1', { quantityDelta: 3, reason: 'Platform correction' }, superadmin);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      actionType: StockMovementAction.MANUAL_ADJUSTMENT, userId: 'admin-1', reason: 'Platform correction', merchantId: 'merchant-2',
    })});
  });

  it('updates low-stock threshold without creating a stock movement', async () => {
    setupOwnedProduct();
    prisma.inventory.upsert.mockResolvedValue({ productId: 'prod-1', availableQuantity: 4, reservedQuantity: 0, lowStockThreshold: 6, lowStockAlertedAt: null, updatedAt: new Date() });
    prisma.inventory.findUnique.mockResolvedValue({ productId: 'prod-1', availableQuantity: 4, reservedQuantity: 0, lowStockThreshold: 6, lowStockAlertedAt: null, updatedAt: new Date() });
    const result = await service.updateThreshold('prod-1', { lowStockThreshold: 6 }, merchant);
    expect(prisma.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { lowStockThreshold: 6 } }));
    expect(result.lowStockThreshold).toBe(6);
    expect(result.stockStatus).toBe('LOW_STOCK');
  });
});
