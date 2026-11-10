import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    createOrder: jest.fn(),
    getCustomerOrders: jest.fn(),
    getOrderById: jest.fn(),
    getMerchantOrders: jest.fn(),
    getMerchantOrderById: jest.fn(),
    updateMerchantOrderStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOrder', () => {
    it('should delegate to ordersService.createOrder with user id, dto, idempotency key and auth token', async () => {
      const mockResult: any = {
        id: 'order-123',
        status: 'PENDING',
        totalAmount: '299.99',
      };
      mockOrdersService.createOrder.mockResolvedValue(mockResult);

      const dto: CreateOrderDto = {
        addressId: '11111111-1111-4111-8111-111111111111',
        paymentMethod: 'COD',
      };

      const result = await controller.createOrder(
        'user-123',
        dto,
        'key-abc',
        'Bearer token-xyz',
      );

      expect(result).toBe(mockResult);
      expect(mockOrdersService.createOrder).toHaveBeenCalledWith(
        'user-123',
        dto,
        'key-abc',
        'Bearer token-xyz',
      );
    });
  });

  describe('getCustomerOrders', () => {
    it('should delegate to ordersService.getCustomerOrders with user id and query parameters', async () => {
      const mockResult: any = {
        data: [{ id: 'order-1' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockOrdersService.getCustomerOrders.mockResolvedValue(mockResult);

      const query: QueryOrdersDto = { page: 1, limit: 10 };
      const result = await controller.getCustomerOrders('user-123', query);

      expect(result).toBe(mockResult);
      expect(mockOrdersService.getCustomerOrders).toHaveBeenCalledWith('user-123', query);
    });
  });

  describe('getMyOrdersAlias', () => {
    it('should delegate to ordersService.getCustomerOrders via my-orders alias', async () => {
      const mockResult: any = {
        data: [{ id: 'order-2' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      mockOrdersService.getCustomerOrders.mockResolvedValue(mockResult);

      const query: QueryOrdersDto = { page: 2, limit: 5 };
      const result = await controller.getMyOrdersAlias('user-123', query);

      expect(result).toBe(mockResult);
      expect(mockOrdersService.getCustomerOrders).toHaveBeenCalledWith('user-123', query);
    });
  });

  describe('getOrderById', () => {
    it('should delegate to ordersService.getOrderById with user id and order id', async () => {
      const mockResult: any = {
        id: 'order-123',
        status: 'PENDING',
      };
      mockOrdersService.getOrderById.mockResolvedValue(mockResult);

      const result = await controller.getOrderById('user-123', 'order-123');
      expect(result).toBe(mockResult);
      expect(mockOrdersService.getOrderById).toHaveBeenCalledWith(
        'user-123',
        'order-123',
      );
    });
  });

  describe('Merchant Endpoints', () => {
    const mockUser = { id: 'merchant-123', role: 'merchant' };

    it('getMerchantOrders should delegate to ordersService.getMerchantOrders', async () => {
      const mockResult: any = { data: [], pagination: { total: 0 } };
      mockOrdersService.getMerchantOrders.mockResolvedValue(mockResult);

      const query: QueryOrdersDto = { page: 1, limit: 10, status: 'PENDING' as any };
      const res = await controller.getMerchantOrders(mockUser, query);

      expect(res).toBe(mockResult);
      expect(mockOrdersService.getMerchantOrders).toHaveBeenCalledWith(mockUser, query);
    });

    it('getMerchantOrderById should delegate to ordersService.getMerchantOrderById', async () => {
      const mockResult: any = { id: 'order-123' };
      mockOrdersService.getMerchantOrderById.mockResolvedValue(mockResult);

      const res = await controller.getMerchantOrderById(mockUser, 'order-123');

      expect(res).toBe(mockResult);
      expect(mockOrdersService.getMerchantOrderById).toHaveBeenCalledWith(mockUser, 'order-123');
    });

    it('updateMerchantOrderStatus should delegate to ordersService.updateMerchantOrderStatus', async () => {
      const mockResult: any = { id: 'order-123', status: 'CONFIRMED' };
      mockOrdersService.updateMerchantOrderStatus.mockResolvedValue(mockResult);

      const body = { status: 'CONFIRMED' as any, notes: 'Order approved' };
      const res = await controller.updateMerchantOrderStatus(mockUser, 'order-123', body);

      expect(res).toBe(mockResult);
      expect(mockOrdersService.updateMerchantOrderStatus).toHaveBeenCalledWith(mockUser, 'order-123', body);
    });
  });
});
