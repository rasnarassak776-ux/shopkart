/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    $executeRaw: jest.fn(),
    inventory: {
      findUnique: jest.fn(),
    },
    inventoryReservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reserveStockInTx', () => {
    it('should throw BadRequestException if requested quantity is zero or negative', async () => {
      const mockTx: any = {
        $executeRaw: jest.fn(),
        inventory: { findUnique: jest.fn() },
        inventoryReservation: { create: jest.fn() },
      };

      await expect(
        service.reserveStockInTx(mockTx, 'order-1', [
          { productId: 'prod-1', quantity: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully reserve stock and create reservation record', async () => {
      const mockTx: any = {
        $executeRaw: jest.fn().mockResolvedValue(1), // 1 row updated
        inventory: {
          findUnique: jest.fn().mockResolvedValue({ productId: 'prod-1', availableQuantity: 8, reservedQuantity: 2, lowStockThreshold: 0, lowStockAlertedAt: null }),
          update: jest.fn(),
        },
        product: { update: jest.fn() },
        stockMovement: { create: jest.fn() },
        inventoryReservation: {
          create: jest.fn().mockResolvedValue({ id: 'res-1' }),
        },
      };

      await service.reserveStockInTx(mockTx, 'order-1', [
        { productId: '20000000-0000-4000-8000-000000000001', productName: 'Item A', quantity: 2 },
      ]);

      expect(mockTx.$executeRaw).toHaveBeenCalled();
      expect(mockTx.inventoryReservation.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          productId: '20000000-0000-4000-8000-000000000001',
          quantity: 2,
          status: ReservationStatus.CONFIRMED,
        },
      });
    });

    it('should throw BadRequestException when insufficient stock is available', async () => {
      const mockTx: any = {
        $executeRaw: jest.fn().mockResolvedValue(0), // 0 rows updated because stock < requested
        inventory: {
          findUnique: jest.fn().mockResolvedValue({
            productId: 'prod-1',
            availableQuantity: 1,
            reservedQuantity: 0,
          }),
        },
        inventoryReservation: { create: jest.fn() },
      };

      await expect(
        service.reserveStockInTx(mockTx, 'order-1', [
          { productId: 'prod-1', productName: 'Item A', quantity: 5 },
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(mockTx.inventoryReservation.create).not.toHaveBeenCalled();
    });
  });

  describe('releaseStockInTx', () => {
    it('should release reservations and restore inventory stock', async () => {
      const mockTx: any = {
        inventoryReservation: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'res-1', productId: 'prod-1', quantity: 3 },
          ]),
          update: jest.fn().mockResolvedValue({ id: 'res-1', status: 'RELEASED' }),
        },
        inventory: {
          findUnique: jest.fn()
            .mockResolvedValueOnce({ productId: 'prod-1', availableQuantity: 3, reservedQuantity: 1, lowStockThreshold: 0, lowStockAlertedAt: null })
            .mockResolvedValue({ productId: 'prod-1', availableQuantity: 6, reservedQuantity: 0, lowStockThreshold: 0, lowStockAlertedAt: null }),
          update: jest.fn(),
        },
        product: {
          findUnique: jest.fn().mockResolvedValue({ merchantId: null }),
          update: jest.fn(),
        },
        stockMovement: { create: jest.fn() },
        $executeRaw: jest.fn().mockResolvedValue(1),
      };

      await service.releaseStockInTx(mockTx, 'order-1');

      expect(mockTx.inventoryReservation.findMany).toHaveBeenCalledWith({
        where: {
          orderId: 'order-1',
          status: { in: [ReservationStatus.RESERVED, ReservationStatus.CONFIRMED] },
        },
      });
      expect(mockTx.$executeRaw).toHaveBeenCalled();
      expect(mockTx.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: ReservationStatus.RELEASED },
      });
    });
  });
});
