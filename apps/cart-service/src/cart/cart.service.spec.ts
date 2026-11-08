import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartStatus, Prisma } from '@prisma/client';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogClient } from '../catalog/catalog.client';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;
  let catalogClient: CatalogClient;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCatalogClient = {
    getProduct: jest.fn(),
    getPrimaryImageUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CatalogClient,
          useValue: mockCatalogClient,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
    catalogClient = module.get<CatalogClient>(CatalogClient);

    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return empty cart representation when user has no active cart', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      const result = await service.getCart('user-1');

      expect(result).toEqual({
        cartId: null,
        items: [],
        summary: {
          totalItems: 0,
          availableItems: 0,
          subtotal: '0.00',
        },
      });
      expect(mockPrismaService.cart.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: CartStatus.ACTIVE },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
    });

    it('should return populated cart with active items and exact decimal subtotal', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        status: CartStatus.ACTIVE,
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'prod-1',
            quantity: 2,
            createdAt: new Date(),
          },
          {
            id: 'item-2',
            cartId: 'cart-1',
            productId: 'prod-2',
            quantity: 1,
            createdAt: new Date(),
          },
        ],
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);

      mockCatalogClient.getProduct.mockImplementation(async (id: string) => {
        if (id === 'prod-1') {
          return {
            id: 'prod-1',
            name: 'Headphones',
            price: '399.99',
            isActive: true,
          };
        }
        if (id === 'prod-2') {
          return {
            id: 'prod-2',
            name: 'Audio Cable',
            price: '19.99',
            isActive: true,
          };
        }
        return null;
      });

      mockCatalogClient.getPrimaryImageUrl.mockReturnValue('https://example.com/img.jpg');

      const result = await service.getCart('user-1');

      expect(result.cartId).toBe('cart-1');
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'item-1',
        productId: 'prod-1',
        name: 'Headphones',
        imageUrl: 'https://example.com/img.jpg',
        unitPrice: '399.99',
        quantity: 2,
        lineTotal: '799.98',
        available: true,
      });
      expect(result.items[1]).toEqual({
        id: 'item-2',
        productId: 'prod-2',
        name: 'Audio Cable',
        imageUrl: 'https://example.com/img.jpg',
        unitPrice: '19.99',
        quantity: 1,
        lineTotal: '19.99',
        available: true,
      });
      // 799.98 + 19.99 = 819.97 exactly
      expect(result.summary).toEqual({
        totalItems: 3,
        availableItems: 3,
        subtotal: '819.97',
      });
    });

    it('should mark inactive or deleted products as unavailable and exclude them from subtotal', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: 'user-1',
        status: CartStatus.ACTIVE,
        items: [
          {
            id: 'item-1',
            cartId: 'cart-1',
            productId: 'active-prod',
            quantity: 1,
          },
          {
            id: 'item-2',
            cartId: 'cart-1',
            productId: 'inactive-prod',
            quantity: 2,
          },
          {
            id: 'item-3',
            cartId: 'cart-1',
            productId: 'deleted-prod',
            quantity: 1,
          },
        ],
      };

      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);

      mockCatalogClient.getProduct.mockImplementation(async (id: string) => {
        if (id === 'active-prod') {
          return { id, name: 'Active Product', price: '100.00', isActive: true };
        }
        if (id === 'inactive-prod') {
          return { id, name: 'Inactive Product', price: '50.00', isActive: false };
        }
        return null; // deleted from catalog
      });

      mockCatalogClient.getPrimaryImageUrl.mockReturnValue('https://example.com/item.jpg');

      const result = await service.getCart('user-1');

      expect(result.items).toHaveLength(3);
      expect(result.items[0].available).toBe(true);
      expect(result.items[0].lineTotal).toBe('100.00');

      expect(result.items[1].available).toBe(false);
      expect(result.items[1].lineTotal).toBe('0.00');

      expect(result.items[2].available).toBe(false);
      expect(result.items[2].lineTotal).toBe('0.00');

      // Subtotal should only sum active product (100.00), availableItems should be 1, totalItems is 4
      expect(result.summary).toEqual({
        totalItems: 4,
        availableItems: 1,
        subtotal: '100.00',
      });
    });
  });

  describe('addItem', () => {
    it('should reject nonexistent or inactive product', async () => {
      mockCatalogClient.getProduct.mockResolvedValue(null);

      await expect(
        service.addItem('user-1', { productId: 'prod-404', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);

      mockCatalogClient.getProduct.mockResolvedValue({
        id: 'inactive',
        isActive: false,
      });

      await expect(
        service.addItem('user-1', { productId: 'inactive', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create cart and add new item atomically within transaction', async () => {
      mockCatalogClient.getProduct.mockResolvedValue({
        id: 'prod-1',
        name: 'Keyboard',
        price: '150.00',
        isActive: true,
      });

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          cart: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'new-cart', userId: 'user-1' }),
          },
          cartItem: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: 'new-item' }),
          },
        };
        return callback(tx);
      });

      // Mock getCart call at the end of addItem
      jest.spyOn(service, 'getCart').mockResolvedValue({
        cartId: 'new-cart',
        items: [],
        summary: { totalItems: 1, availableItems: 1, subtotal: '150.00' },
      });

      const result = await service.addItem('user-1', {
        productId: 'prod-1',
        quantity: 1,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(service.getCart).toHaveBeenCalledWith('user-1');
      expect(result.summary.subtotal).toBe('150.00');
    });

    it('should increment existing item quantity atomically', async () => {
      mockCatalogClient.getProduct.mockResolvedValue({
        id: 'prod-1',
        name: 'Mouse',
        price: '50.00',
        isActive: true,
      });

      let updatedQuantity = 0;

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          cart: {
            findFirst: jest.fn().mockResolvedValue({ id: 'existing-cart', userId: 'user-1' }),
          },
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'existing-item',
              quantity: 2,
            }),
            update: jest.fn().mockImplementation((args: any) => {
              updatedQuantity = args.data.quantity;
              return { id: 'existing-item', quantity: updatedQuantity };
            }),
          },
        };
        return callback(tx);
      });

      jest.spyOn(service, 'getCart').mockResolvedValue({
        cartId: 'existing-cart',
        items: [],
        summary: { totalItems: 5, availableItems: 5, subtotal: '250.00' },
      });

      await service.addItem('user-1', {
        productId: 'prod-1',
        quantity: 3,
      });

      expect(updatedQuantity).toBe(5);
    });

    it('should reject if incrementing quantity exceeds maximum limit of 99', async () => {
      mockCatalogClient.getProduct.mockResolvedValue({
        id: 'prod-1',
        name: 'Screen',
        price: '300.00',
        isActive: true,
      });

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          cart: {
            findFirst: jest.fn().mockResolvedValue({ id: 'cart-1', userId: 'user-1' }),
          },
          cartItem: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'item-1',
              quantity: 95,
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.addItem('user-1', { productId: 'prod-1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity for owned active cart', async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'p-1',
        quantity: 2,
      });
      mockPrismaService.cartItem.update.mockResolvedValue({
        id: 'item-1',
        quantity: 5,
      });

      jest.spyOn(service, 'getCart').mockResolvedValue({
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 5, availableItems: 5, subtotal: '500.00' },
      });

      const result = await service.updateItemQuantity('user-1', 'item-1', {
        quantity: 5,
      });

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 },
      });
      expect(result.summary.totalItems).toBe(5);
    });

    it('should throw NotFoundException if item does not belong to user or does not exist', async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItemQuantity('user-1', 'other-item', { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove item and return updated cart', async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
      });
      mockPrismaService.cartItem.delete.mockResolvedValue({ id: 'item-1' });

      jest.spyOn(service, 'getCart').mockResolvedValue({
        cartId: 'cart-1',
        items: [],
        summary: { totalItems: 0, availableItems: 0, subtotal: '0.00' },
      });

      const result = await service.removeItem('user-1', 'item-1');

      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
      expect(result.summary.totalItems).toBe(0);
    });

    it('should throw NotFoundException if item to remove does not exist or belongs to another user', async () => {
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('user-1', 'unowned-item')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clearCart', () => {
    it('should delete all cart items for active cart and return empty cart representation', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-1',
      });
      mockPrismaService.cartItem.deleteMany.mockResolvedValue({ count: 4 });

      const result = await service.clearCart('user-1');

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(result).toEqual({
        cartId: 'cart-1',
        items: [],
        summary: {
          totalItems: 0,
          availableItems: 0,
          subtotal: '0.00',
        },
      });
    });

    it('should safely return empty cart when user has no active cart to clear', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      const result = await service.clearCart('user-1');

      expect(mockPrismaService.cartItem.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        cartId: null,
        items: [],
        summary: {
          totalItems: 0,
          availableItems: 0,
          subtotal: '0.00',
        },
      });
    });
  });

  describe('convertCart', () => {
    it('should update active cart status to CONVERTED', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue({ id: 'cart-1', userId: 'user-1' });
      mockPrismaService.cart.update.mockResolvedValue({ id: 'cart-1', status: 'CONVERTED' });

      const result = await service.convertCart('user-1');

      expect(mockPrismaService.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { status: 'CONVERTED' },
      });
      expect(result).toEqual({ success: true, cartId: 'cart-1' });
    });

    it('should return success if no active cart exists to convert', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      const result = await service.convertCart('user-1');

      expect(mockPrismaService.cart.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'No active cart found to convert' });
    });
  });
});
