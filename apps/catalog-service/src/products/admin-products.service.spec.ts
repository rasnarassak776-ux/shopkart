import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService - Admin Operations', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    category: {
      findUnique: jest.Mock;
    };
    orderItem: {
      count: jest.Mock;
    };
    inventoryReservation: {
      count: jest.Mock;
      deleteMany: jest.Mock;
    };
    inventory: {
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    cartItem: {
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const sampleCategory = {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Electronics',
    slug: 'electronics',
  };

  const sampleProduct = {
    id: 'prod-uuid-1',
    categoryId: sampleCategory.id,
    name: 'Mechanical Keyboard',
    slug: 'mechanical-keyboard',
    sku: 'KB-001',
    description: 'RGB mechanical keyboard',
    price: new Prisma.Decimal('4999.00'),
    brand: 'KeyTech',
    isActive: true,
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-02'),
    category: sampleCategory,
    images: [
      {
        id: 'img-1',
        productId: 'prod-uuid-1',
        imageUrl: 'https://example.com/kb.jpg',
        altText: 'Keyboard front',
        displayOrder: 0,
        isPrimary: true,
        createdAt: new Date('2026-11-01'),
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      product: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
      inventoryReservation: {
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    };
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('create (Product Creation)', () => {
    it('successfully creates a product and normalizes decimal price', async () => {
      prisma.category.findUnique.mockResolvedValue(sampleCategory);
      prisma.product.findUnique.mockResolvedValue(null); // No SKU collision
      prisma.product.findFirst.mockResolvedValue(null); // No slug collision
      prisma.product.create.mockResolvedValue(sampleProduct);

      const result = await service.create({
        name: 'Mechanical Keyboard',
        sku: 'KB-001',
        price: 4999,
        categoryId: sampleCategory.id,
        brand: 'KeyTech',
        description: 'RGB mechanical keyboard',
        isActive: true,
      });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: sampleCategory.id },
        select: { id: true },
      });
      expect(prisma.product.create).toHaveBeenCalled();
      expect(result.id).toBe(sampleProduct.id);
      expect(result.price).toBe('4999');
      expect(result.sku).toBe('KB-001');
    });

    it('rejects creation if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Invalid Category Product',
          sku: 'INV-001',
          price: 999,
          categoryId: 'non-existent-cat',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('rejects creation if SKU already exists', async () => {
      prisma.category.findUnique.mockResolvedValue(sampleCategory);
      prisma.product.findUnique.mockResolvedValue({ id: 'existing-prod-id' });

      await expect(
        service.create({
          name: 'Keyboard',
          sku: 'KB-001',
          price: 4999,
          categoryId: sampleCategory.id,
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('handles slug collisions safely by generating incremental suffix', async () => {
      prisma.category.findUnique.mockResolvedValue(sampleCategory);
      prisma.product.findUnique.mockResolvedValue(null); // SKU available
      // First slug candidate 'gaming-mouse' is taken, second 'gaming-mouse-1' is free
      prisma.product.findFirst
        .mockResolvedValueOnce({ id: 'other-prod-id' })
        .mockResolvedValueOnce(null);

      prisma.product.create.mockImplementation(({ data }) =>
        Promise.resolve({
          ...sampleProduct,
          slug: data.slug,
          price: new Prisma.Decimal('1499'),
        }),
      );

      const result = await service.create({
        name: 'Gaming Mouse',
        sku: 'MOU-002',
        price: 1499,
        categoryId: sampleCategory.id,
      });

      expect(result.slug).toBe('gaming-mouse-1');
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'gaming-mouse-1',
          }),
        }),
      );
    });
  });

  describe('findAllForAdmin (Listing, Filtering & Pagination)', () => {
    it('returns both active and inactive products when isActive is not specified', async () => {
      const inactiveProduct = {
        ...sampleProduct,
        id: 'prod-uuid-2',
        name: 'Discontinued Monitor',
        isActive: false,
      };

      prisma.product.count.mockResolvedValue(2);
      prisma.product.findMany.mockResolvedValue([
        sampleProduct,
        inactiveProduct,
      ]);

      const result = await service.findAllForAdmin({});

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].isActive).toBe(true);
      expect(result.data[1].isActive).toBe(false);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBeUndefined();
    });

    it('filters strictly by isActive when specified', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([sampleProduct]);

      await service.findAllForAdmin({ isActive: false });

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(false);
    });

    it('filters by categoryId and search query', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([sampleProduct]);

      await service.findAllForAdmin({
        categoryId: sampleCategory.id,
        search: 'Keyboard',
      });

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.categoryId).toBe(sampleCategory.id);
      expect(where.OR).toBeDefined();
    });

    it('computes correct pagination metadata', async () => {
      prisma.product.count.mockResolvedValue(55);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.findAllForAdmin({ page: 3, limit: 20 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(55);
      expect(result.totalPages).toBe(3);

      const args = prisma.product.findMany.mock.calls[0][0];
      expect(args.skip).toBe(40);
      expect(args.take).toBe(20);
    });
  });

  describe('findByIdForAdmin', () => {
    it('returns product details even if inactive', async () => {
      const inactiveProduct = {
        ...sampleProduct,
        isActive: false,
      };
      prisma.product.findUnique.mockResolvedValue(inactiveProduct);

      const result = await service.findByIdForAdmin(sampleProduct.id);

      expect(result.id).toBe(sampleProduct.id);
      expect(result.isActive).toBe(false);
      expect(result.primaryImage?.id).toBe('img-1');
    });

    it('throws NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.findByIdForAdmin('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (Product Update)', () => {
    it('successfully applies partial updates', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.product.update.mockResolvedValue({
        ...sampleProduct,
        name: 'Updated Mechanical Keyboard',
        price: new Prisma.Decimal('5499.00'),
      });

      const result = await service.update(sampleProduct.id, {
        name: 'Updated Mechanical Keyboard',
        price: 5499,
      });

      expect(result.name).toBe('Updated Mechanical Keyboard');
      expect(result.price).toBe('5499');
    });

    it('rejects update if category does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(sampleProduct.id, {
          categoryId: 'non-existent-cat-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update if new SKU collides with another product', async () => {
      prisma.product.findUnique.mockResolvedValue(sampleProduct);
      prisma.product.findFirst.mockResolvedValue({ id: 'another-product-id' });

      await expect(
        service.update(sampleProduct.id, {
          sku: 'EXISTING-SKU',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setStatus (Product Activation / Deactivation)', () => {
    it('toggles product active status', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: sampleProduct.id,
      });
      prisma.product.update.mockResolvedValue({
        ...sampleProduct,
        isActive: false,
      });

      const result = await service.setStatus(sampleProduct.id, false);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleProduct.id },
          data: { isActive: false },
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when toggling non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.setStatus('unknown-id', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete (Referential Integrity & Safe Deletion)', () => {
    it('REJECTS deletion if product is referenced in historical orders', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: sampleProduct.id,
        name: sampleProduct.name,
      });
      // 3 historical order items exist for this product
      prisma.orderItem.count.mockResolvedValue(3);

      await expect(service.delete(sampleProduct.id)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('REJECTS deletion if active inventory reservations exist', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: sampleProduct.id,
        name: sampleProduct.name,
      });
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.inventoryReservation.count.mockResolvedValue(1);

      await expect(service.delete(sampleProduct.id)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('REJECTS deletion if physical inventory stock exists', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: sampleProduct.id,
        name: sampleProduct.name,
      });
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.inventoryReservation.count.mockResolvedValue(0);
      prisma.inventory.findUnique.mockResolvedValue({
        availableQuantity: 15,
        reservedQuantity: 0,
      });

      await expect(service.delete(sampleProduct.id)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('SAFELY deletes product when not referenced in orders, reservations, or inventory', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: sampleProduct.id,
        name: sampleProduct.name,
      });
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.inventoryReservation.count.mockResolvedValue(0);
      prisma.inventory.findUnique.mockResolvedValue(null);

      const result = await service.delete(sampleProduct.id);

      expect(result.success).toBe(true);
      expect(result.id).toBe(sampleProduct.id);
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: sampleProduct.id },
      });
    });
  });
});

