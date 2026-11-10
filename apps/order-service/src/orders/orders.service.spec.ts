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
      updateMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    cart: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb))),
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
    releaseStockForItemsInTx: jest.fn(),
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
    mockPrismaService.$transaction.mockImplementation((cb: any) =>
      typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb),
    );
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

  describe('getCustomerOrders', () => {
    it('should return paginated orders for the authenticated customer', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'user-123',
          status: OrderStatus.PENDING,
          totalAmount: new Prisma.Decimal('299.00'),
          addressSnapshot: { fullName: 'Jane Doe' },
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              productNameSnapshot: 'Coffee Mug',
              quantity: 2,
              unitPriceSnapshot: new Prisma.Decimal('149.50'),
            },
          ],
          payments: [
            {
              paymentMethod: 'COD',
              paymentStatus: 'COD_PENDING',
              amount: new Prisma.Decimal('299.00'),
            },
          ],
          statusHistory: [{ status: OrderStatus.PENDING, changedAt: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.getCustomerOrders('user-123', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('order-1');
      expect(result.data[0].itemCount).toBe(2);
      expect(result.data[0].currency).toBe('INR');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(false);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          items: true,
          payments: true,
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      });
    });

    it('should apply optional status filter when provided', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.getCustomerOrders('user-123', {
        page: 1,
        limit: 10,
        status: OrderStatus.CONFIRMED,
      });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-123',
            status: OrderStatus.CONFIRMED,
          },
        }),
      );
    });

    it('should clamp limit to max 50 and page to min 1', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.getCustomerOrders('user-123', {
        page: -5,
        limit: 100,
      });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should calculate hasNextPage and hasPreviousPage accurately across multiple pages', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(25);

      const page2Result = await service.getCustomerOrders('user-123', { page: 2, limit: 10 });
      expect(page2Result.pagination.page).toBe(2);
      expect(page2Result.pagination.totalPages).toBe(3);
      expect(page2Result.pagination.hasPreviousPage).toBe(true);
      expect(page2Result.pagination.hasNextPage).toBe(true);
    });

    it('should return empty list and zero counts when customer has no orders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      const result = await service.getCustomerOrders('new-user', {});
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('Merchant Order Management', () => {
    const merchantUser = { id: 'merchant-aaa', role: 'merchant' };
    const superadminUser = { id: 'superadmin-1', role: 'superadmin' };

    const mockOrderRaw = {
      id: '11111111-2222-3333-4444-555555555555',
      userId: 'customer-1',
      status: OrderStatus.PENDING,
      totalAmount: new Prisma.Decimal('250.00'),
      addressSnapshot: { fullName: 'Customer Name' },
      createdAt: new Date('2026-11-10T10:00:00Z'),
      updatedAt: new Date('2026-11-10T10:00:00Z'),
      payment: {
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COD_PENDING,
        amount: new Prisma.Decimal('250.00'),
      },
      items: [
        {
          id: 'item-1',
          productId: 'prod-merchant-a',
          merchantId: 'merchant-aaa',
          productNameSnapshot: 'Merchant A Product',
          quantity: 2,
          unitPriceSnapshot: new Prisma.Decimal('100.00'),
          status: OrderStatus.PENDING,
        },
        {
          id: 'item-2',
          productId: 'prod-merchant-b',
          merchantId: 'merchant-bbb',
          productNameSnapshot: 'Merchant B Product',
          quantity: 1,
          unitPriceSnapshot: new Prisma.Decimal('50.00'),
          status: OrderStatus.PENDING,
        },
      ],
      statusHistory: [
        {
          id: 'hist-1',
          status: OrderStatus.PENDING,
          createdAt: new Date('2026-11-10T10:00:00Z'),
          notes: 'Order placed',
        },
      ],
    };

    describe('getMerchantOrders', () => {
      it('should isolate orders and items strictly for calling merchant', async () => {
        mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-merchant-a' }]);
        mockPrismaService.order.findMany.mockResolvedValue([mockOrderRaw]);
        mockPrismaService.order.count.mockResolvedValue(1);

        const result = await service.getMerchantOrders(merchantUser, { page: 1, limit: 10 });

        expect(result.data).toHaveLength(1);
        const order = result.data[0];
        // Only merchant-aaa item should be visible
        expect(order.items).toHaveLength(1);
        expect(order.items[0].merchantId).toBe('merchant-aaa');
        // Merchant subtotal should be 2 * 100 = 200.00, not 250.00
        expect(order.totalAmount).toBe('200.00');
        expect(order.itemCount).toBe(2);
      });

      it('should allow superadmin platform-wide order visibility', async () => {
        mockPrismaService.order.findMany.mockResolvedValue([mockOrderRaw]);
        mockPrismaService.order.count.mockResolvedValue(1);

        const result = await service.getMerchantOrders(superadminUser, { page: 1, limit: 10 });

        expect(result.data).toHaveLength(1);
        // Superadmin sees all items
        expect(result.data[0].items).toHaveLength(2);
        expect(result.data[0].totalAmount).toBe('250.00');
      });
    });

    describe('getMerchantOrderById', () => {
      it('should return order details scoped to calling merchant', async () => {
        mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-merchant-a' }]);
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrderRaw);

        const result = await service.getMerchantOrderById(
          merchantUser,
          '11111111-2222-3333-4444-555555555555',
        );

        expect(result.id).toBe(mockOrderRaw.id);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Merchant A Product');
        expect(result.totalAmount).toBe('200.00');
      });

      it('should throw NotFoundException if merchant owns none of the items in the order', async () => {
        mockPrismaService.product.findMany.mockResolvedValue([]);
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrderRaw);

        const otherMerchant = { id: 'merchant-stranger', role: 'merchant' };

        await expect(
          service.getMerchantOrderById(
            otherMerchant,
            '11111111-2222-3333-4444-555555555555',
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateMerchantOrderStatus', () => {
      it('should allow valid transition from PENDING to CONFIRMED for merchant items', async () => {
        mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-merchant-a' }]);
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrderRaw);
        mockPrismaService.orderItem.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
        mockPrismaService.orderItem.findMany.mockResolvedValue([
          { ...mockOrderRaw.items[0], status: OrderStatus.CONFIRMED },
          mockOrderRaw.items[1],
        ]);
        mockPrismaService.order.update.mockResolvedValue({});

        const updated = await service.updateMerchantOrderStatus(
          merchantUser,
          '11111111-2222-3333-4444-555555555555',
          { status: OrderStatus.CONFIRMED, notes: 'Merchant accepted order' },
        );

        expect(mockPrismaService.orderItem.updateMany).toHaveBeenCalledWith({
          where: { id: { in: ['item-1'] } },
          data: { status: OrderStatus.CONFIRMED },
        });
        expect(mockPrismaService.orderStatusHistory.create).toHaveBeenCalled();
      });

      it('should reject invalid lifecycle transition (PENDING -> DELIVERED) with BadRequestException', async () => {
        mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-merchant-a' }]);
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrderRaw);

        await expect(
          service.updateMerchantOrderStatus(
            merchantUser,
            '11111111-2222-3333-4444-555555555555',
            { status: OrderStatus.DELIVERED },
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should release inventory for only cancelled merchant items upon CANCELLED transition', async () => {
        mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-merchant-a' }]);
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrderRaw);
        mockPrismaService.orderItem.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
        mockPrismaService.orderItem.findMany.mockResolvedValue([
          { ...mockOrderRaw.items[0], status: OrderStatus.CANCELLED },
          mockOrderRaw.items[1],
        ]);
        mockPrismaService.order.update.mockResolvedValue({});

        await service.updateMerchantOrderStatus(
          merchantUser,
          '11111111-2222-3333-4444-555555555555',
          { status: OrderStatus.CANCELLED, notes: 'Out of stock' },
        );

        expect(mockInventoryService.releaseStockForItemsInTx).toHaveBeenCalledWith(
          expect.anything(),
          mockOrderRaw.id,
          ['prod-merchant-a'],
        );
      });

      it('should trigger COD_COLLECTED payment update when all order items reach DELIVERED', async () => {
        const shippedOrderRaw = {
          ...mockOrderRaw,
          status: OrderStatus.SHIPPED,
          items: [
            { ...mockOrderRaw.items[0], status: OrderStatus.SHIPPED },
          ],
        };

        mockPrismaService.product.findMany.mockResolvedValue([{ id: 'prod-merchant-a' }]);
        mockPrismaService.order.findUnique.mockResolvedValue(shippedOrderRaw);
        mockPrismaService.orderItem.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.orderStatusHistory.create.mockResolvedValue({});
        mockPrismaService.orderItem.findMany.mockResolvedValue([
          { ...shippedOrderRaw.items[0], status: OrderStatus.DELIVERED },
        ]);
        mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.order.update.mockResolvedValue({});

        await service.updateMerchantOrderStatus(
          merchantUser,
          '11111111-2222-3333-4444-555555555555',
          { status: OrderStatus.DELIVERED },
        );

        expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith({
          where: {
            orderId: shippedOrderRaw.id,
            paymentMethod: PaymentMethod.COD,
            paymentStatus: PaymentStatus.COD_PENDING,
          },
          data: {
            paymentStatus: PaymentStatus.COD_COLLECTED,
          },
        });
      });
    });
  });
});
