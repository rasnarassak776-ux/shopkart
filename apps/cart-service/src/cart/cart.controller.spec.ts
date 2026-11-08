import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

  const mockCartService = {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItemQuantity: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
    convertCart: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('should delegate to cartService.getCart with user id', async () => {
      const mockResult = {
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 0, subtotal: '0.00' },
      };
      mockCartService.getCart.mockResolvedValue(mockResult);

      const result = await controller.getCart('user-123');
      expect(result).toBe(mockResult);
      expect(mockCartService.getCart).toHaveBeenCalledWith('user-123');
    });
  });

  describe('addItem', () => {
    it('should delegate to cartService.addItem with user id and dto', async () => {
      const dto: AddCartItemDto = {
        productId: '11111111-1111-1111-1111-111111111111',
        quantity: 2,
      };
      const mockResult = {
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 2, subtotal: '200.00' },
      };
      mockCartService.addItem.mockResolvedValue(mockResult);

      const result = await controller.addItem('user-123', dto);
      expect(result).toBe(mockResult);
      expect(mockCartService.addItem).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('updateItemQuantity', () => {
    it('should delegate to cartService.updateItemQuantity', async () => {
      const dto: UpdateCartItemDto = { quantity: 4 };
      const mockResult = {
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 4, subtotal: '400.00' },
      };
      mockCartService.updateItemQuantity.mockResolvedValue(mockResult);

      const result = await controller.updateItemQuantity('user-123', 'item-1', dto);
      expect(result).toBe(mockResult);
      expect(mockCartService.updateItemQuantity).toHaveBeenCalledWith('user-123', 'item-1', dto);
    });
  });

  describe('removeItem', () => {
    it('should delegate to cartService.removeItem', async () => {
      const mockResult = {
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 0, subtotal: '0.00' },
      };
      mockCartService.removeItem.mockResolvedValue(mockResult);

      const result = await controller.removeItem('user-123', 'item-1');
      expect(result).toBe(mockResult);
      expect(mockCartService.removeItem).toHaveBeenCalledWith('user-123', 'item-1');
    });
  });

  describe('clearCart', () => {
    it('should delegate to cartService.clearCart', async () => {
      const mockResult = {
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 0, subtotal: '0.00' },
      };
      mockCartService.clearCart.mockResolvedValue(mockResult);

      const result = await controller.clearCart('user-123');
      expect(result).toBe(mockResult);
      expect(mockCartService.clearCart).toHaveBeenCalledWith('user-123');
    });
  });

  describe('convertCart', () => {
    it('should delegate to cartService.convertCart', async () => {
      const mockResult = {
        success: true,
        cartId: 'cart-1',
      };
      mockCartService.convertCart.mockResolvedValue(mockResult);

      const result = await controller.convertCart('user-123');
      expect(result).toBe(mockResult);
      expect(mockCartService.convertCart).toHaveBeenCalledWith('user-123');
    });
  });
});
