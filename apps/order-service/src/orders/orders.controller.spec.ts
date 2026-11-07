import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    createOrder: jest.fn(),
    getOrderById: jest.fn(),
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
});
