import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductsDto } from './dto/query-products.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const mockProduct = {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: 'Wireless Headphones',
    slug: 'wireless-headphones',
    sku: 'ELEC-001',
    description: 'Wireless over-ear headphones',
    price: { toString: () => '2499.00' },
    brand: 'SoundMaster',
    isActive: true,
    createdAt: new Date('2026-11-05'),
    updatedAt: new Date('2026-11-05'),
    category: { id: 'cat-1', name: 'Electronics', slug: 'electronics' },
    images: [
      {
        id: 'img-1',
        productId: 'prod-1',
        imageUrl: 'https://example.com/headphones.jpg',
        altText: 'Headphones',
        displayOrder: 0,
        isPrimary: true,
        createdAt: new Date('2026-11-05'),
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      product: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new ProductsService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns paginated active products by default', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAll({} as QueryProductsDto);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(12);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].price).toBe('2499.00');

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
    });

    it('filters by categoryId', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({
        categoryId: '10000000-0000-4000-8000-000000000001',
      } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.categoryId).toBe('10000000-0000-4000-8000-000000000001');
    });

    it('paginates using page and limit', async () => {
      prisma.product.count.mockResolvedValue(45);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        page: 3,
        limit: 10,
      } as QueryProductsDto);

      const args = prisma.product.findMany.mock.calls[0][0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('searches across name, description, sku and brand', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'headphone' } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(4);
      expect(where.OR[0].name.contains).toBe('headphone');
      expect(where.OR[0].name.mode).toBe('insensitive');
      expect(where.OR[1].description.contains).toBe('headphone');
    });

    it('returns an empty result set when nothing matches', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        search: 'nonexistent-term',
      } as QueryProductsDto);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('always excludes inactive products', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({} as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
    });

    it('filters by minimum price', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ minPrice: 500 } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.price).toEqual({ gte: 500 });
    });

    it('filters by maximum price', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ maxPrice: 5000 } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.price).toEqual({ lte: 5000 });
    });

    it('filters by combined price range', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({
        minPrice: 500,
        maxPrice: 5000,
      } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.price).toEqual({ gte: 500, lte: 5000 });
    });

    it('rejects minPrice greater than maxPrice', async () => {
      await expect(
        service.findAll({
          minPrice: 5000,
          maxPrice: 500,
        } as QueryProductsDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('filters by brand case-insensitively', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ brand: 'SoundMaster' } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.brand).toEqual({
        equals: 'SoundMaster',
        mode: 'insensitive',
      });
    });

    it('combines search, category, price and brand filters', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({
        search: 'phone',
        categoryId: '10000000-0000-4000-8000-000000000001',
        minPrice: 5000,
        maxPrice: 50000,
        brand: 'TechNova',
      } as QueryProductsDto);

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.isActive).toBe(true);
      expect(where.categoryId).toBe('10000000-0000-4000-8000-000000000001');
      expect(where.brand).toEqual({ equals: 'TechNova', mode: 'insensitive' });
      expect(where.price).toEqual({ gte: 5000, lte: 50000 });
      expect(where.OR).toHaveLength(4);
    });

    it('sorts by price ascending with id tiebreaker', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({
        sortBy: 'price',
        sortOrder: 'asc',
      } as QueryProductsDto);

      const orderBy = prisma.product.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual([{ price: 'asc' }, { id: 'asc' }]);
    });

    it('sorts by price descending', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({
        sortBy: 'price',
        sortOrder: 'desc',
      } as QueryProductsDto);

      const orderBy = prisma.product.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual([{ price: 'desc' }, { id: 'asc' }]);
    });

    it('sorts by name and createdAt', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({
        sortBy: 'name',
        sortOrder: 'asc',
      } as QueryProductsDto);
      expect(prisma.product.findMany.mock.calls[0][0].orderBy).toEqual([
        { name: 'asc' },
        { id: 'asc' },
      ]);

      await service.findAll({
        sortBy: 'createdAt',
        sortOrder: 'asc',
      } as QueryProductsDto);
      expect(prisma.product.findMany.mock.calls[1][0].orderBy).toEqual([
        { createdAt: 'asc' },
        { id: 'asc' },
      ]);
    });

    it('defaults to newest first', async () => {
      prisma.product.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({} as QueryProductsDto);

      const orderBy = prisma.product.findMany.mock.calls[0][0].orderBy;
      expect(orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });

    it('uses the same filters for count and findMany', async () => {
      prisma.product.count.mockResolvedValue(3);
      prisma.product.findMany.mockResolvedValue([]);

      const query = {
        search: 'lamp',
        minPrice: 100,
        page: 2,
        limit: 12,
      } as QueryProductsDto;
      await service.findAll(query);

      const countWhere = prisma.product.count.mock.calls[0][0].where;
      const findWhere = prisma.product.findMany.mock.calls[0][0].where;
      expect(countWhere).toEqual(findWhere);
      expect(prisma.product.findMany.mock.calls[0][0].skip).toBe(12);
      expect(prisma.product.findMany.mock.calls[0][0].take).toBe(12);
    });
  });

  describe('findBrands', () => {
    it('returns distinct active product brands', async () => {
      prisma.product.findMany.mockResolvedValue([
        { brand: 'SoundMaster' },
        { brand: 'TechNova' },
      ]);

      const result = await service.findBrands();

      expect(result).toEqual(['SoundMaster', 'TechNova']);
      const args = prisma.product.findMany.mock.calls[0][0];
      expect(args.where.isActive).toBe(true);
      expect(args.distinct).toEqual(['brand']);
    });

    it('filters out null brands', async () => {
      prisma.product.findMany.mockResolvedValue([
        { brand: 'GlowLab' },
        { brand: null },
      ]);

      const result = await service.findBrands();

      expect(result).toEqual(['GlowLab']);
    });
  });

  describe('findById', () => {
    it('returns the product when found', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findById('prod-1');

      expect(result.id).toBe('prod-1');
      expect(result.price).toBe('2499.00');
      expect(result.images).toHaveLength(1);
    });

    it('throws NotFoundException when missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for inactive products', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });

      await expect(service.findById('prod-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('returns the product when found', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findBySlug('wireless-headphones');

      expect(result.slug).toBe('wireless-headphones');
    });

    it('throws NotFoundException when missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException for inactive products', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });

      await expect(
        service.findBySlug('wireless-headphones'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
