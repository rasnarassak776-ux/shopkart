import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthClient } from '../clients/auth.client';
import { CartClient } from '../clients/cart.client';
import { CatalogClient } from '../clients/catalog.client';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    cart: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuthClient = {
    getAddressSnapshot: jest.fn(),
  };

  const mockCartClient = {
    getCart: jest.fn(),
    convertCart: jest.fn(),
  };

  const mockCatalogClient = {
    getProduct: jest.fn(),
  };

  const mockInventoryService = {
    reserveStockInTx: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthClient, useValue: mockAuthClient },
        { provide: CartClient, useValue: mockCartClient },
        { provide: CatalogClient, useValue: mockCatalogClient },
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const validDto: CreateOrderDto = {
      addressId: '11111111-1111-4111-8111-111111111111',
      paymentMethod: 'COD',
    };
    const userId = 'user-123';
    const idempotencyKey = 'key-uuid-1';
    const authToken = 'Bearer token-1';

    it('should throw BadRequestException if idempotencyKey is missing or empty', async () => {
      await expect(
        service.createOrder(userId, validDto, '', authToken),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createOrder(userId, validDto, '   ', authToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing order on idempotent replay with matching key', async () => {
      const mockExistingOrder = {
        id: 'order-existing',
        userId,
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal('299.99'),
        addressSnapshot: { fullName: 'Test User' },
        items: [],
        payments: [
          {
            paymentMethod: PaymentMethod.COD,
            paymentStatus: PaymentStatus.COD_PENDING,
            amount: new Prisma.Decimal('299.99'),
            idempotencyKey,
          },
        ],
        statusHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        idempotencyKey,
        order: mockExistingOrder,
      });

      const result = await service.createOrder(
        userId,
        validDto,
        idempotencyKey,
        authToken,
      );

      expect(result.id).toBe('order-existing');
      expect(result.totalAmount).toBe('299.99');
      expect(mockAuthClient.getAddressSnapshot).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if idempotent replay matches an order belonging to another user', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        idempotencyKey,
        order: {
          id: 'order-other',
          userId: 'other-user',
        },
      });

      await expect(
        service.createOrder(userId, validDto, idempotencyKey, authToken),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if cart is empty', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      mockAuthClient.getAddressSnapshot.mockResolvedValue({
        fullName: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      });
      mockCartClient.getCart.mockResolvedValue({
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 0, subtotal: '0.00' },
      });

      await expect(
        service.createOrder(userId, validDto, idempotencyKey, authToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if a cart product is not active or missing in Catalog', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      mockAuthClient.getAddressSnapshot.mockResolvedValue({
        fullName: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      });
      mockCartClient.getCart.mockResolvedValue({
        cartId: 'cart-1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-inactive',
            name: 'Old Item',
            quantity: 1,
            unitPrice: '100.00',
            lineTotal: '100.00',
            available: true,
          },
        ],
        summary: { totalItems: 1, subtotal: '100.00' },
      });
      mockCatalogClient.getProduct.mockResolvedValue({
        id: 'prod-inactive',
        name: 'Old Item',
        price: '100.00',
        isActive: false, // inactive!
      });

      await expect(
        service.createOrder(userId, validDto, idempotencyKey, authToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully place COD order, reserve inventory, and convert cart', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      mockAuthClient.getAddressSnapshot.mockResolvedValue({
        fullName: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      });
      mockCartClient.getCart.mockResolvedValue({
        cartId: 'cart-1',
        items: [
          {
            id: 'item-1',
            productId: '20000000-0000-4000-8000-000000000001',
            name: 'Wireless Headphones',
            quantity: 2,
            unitPrice: '150.00',
            lineTotal: '300.00',
            available: true,
          },
        ],
        summary: { totalItems: 2, subtotal: '300.00' },
      });
      mockCatalogClient.getProduct.mockResolvedValue({
        id: '20000000-0000-4000-8000-000000000001',
        name: 'Wireless Headphones',
        price: '150.00',
        isActive: true,
      });

      const createdOrderId = 'order-new-123';
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue({ id: createdOrderId }),
          },
          orderItem: {
            create: jest.fn().mockResolvedValue({ id: 'oi-1' }),
          },
          payment: {
            create: jest.fn().mockResolvedValue({ id: 'pay-new' }),
          },
          orderStatusHistory: {
            create: jest.fn().mockResolvedValue({ id: 'osh-1' }),
          },
        };
        return callback(tx);
      });

      const mockCompleteOrder = {
        id: createdOrderId,
        userId,
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal('300.00'),
        addressSnapshot: {
          fullName: 'John Doe',
          phone: '9876543210',
          addressLine1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        items: [
          {
            id: 'oi-1',
            productId: '20000000-0000-4000-8000-000000000001',
            productNameSnapshot: 'Wireless Headphones',
            quantity: 2,
            unitPriceSnapshot: new Prisma.Decimal('150.00'),
          },
        ],
        payments: [
          {
            paymentMethod: PaymentMethod.COD,
            paymentStatus: PaymentStatus.COD_PENDING,
            amount: new Prisma.Decimal('300.00'),
            idempotencyKey,
          },
        ],
        statusHistory: [
          {
            status: OrderStatus.PENDING,
            changedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockCompleteOrder);
      mockCartClient.convertCart.mockResolvedValue(undefined);

      const result = await service.createOrder(
        userId,
        validDto,
        idempotencyKey,
        authToken,
      );

      expect(result.id).toBe(createdOrderId);
      expect(result.status).toBe('PENDING');
      expect(result.totalAmount).toBe('300.00');
      expect(result.payment?.paymentMethod).toBe('COD');
      expect(result.payment?.paymentStatus).toBe('COD_PENDING');
      expect(result.items.length).toBe(1);
      expect(result.items[0].totalPrice).toBe('300.00');
      expect(mockCartClient.convertCart).toHaveBeenCalledWith(authToken);
      expect(mockInventoryService.reserveStockInTx).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order if found and belongs to user', async () => {
      const mockOrder = {
        id: 'order-123',
        userId: 'user-123',
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal('199.99'),
        addressSnapshot: { fullName: 'John Doe' },
        items: [],
        payments: [],
        statusHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrderById('user-123', 'order-123');
      expect(result.id).toBe('order-123');
      expect(result.totalAmount).toBe('199.99');
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrderById('user-123', 'order-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        userId: 'different-user',
      });

      await expect(
        service.getOrderById('user-123', 'order-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
