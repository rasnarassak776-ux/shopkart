import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    parentId: null,
    isActive: true,
    createdAt: new Date('2026-11-05'),
    updatedAt: new Date('2026-11-05'),
    children: [],
    _count: { products: 4 },
  };

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns only active top-level categories by default', async () => {
      prisma.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      const args = prisma.category.findMany.mock.calls[0][0];
      expect(args.where.isActive).toBe(true);
      expect(args.where.parentId).toBeNull();
    });

    it('includes inactive categories when requested', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await service.findAll(true);

      const args = prisma.category.findMany.mock.calls[0][0];
      expect(args.where.isActive).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('returns the category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findById('cat-1');

      expect(result.name).toBe('Electronics');
    });

    it('throws NotFoundException when missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('returns the category when found', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findBySlug('electronics');

      expect(result.slug).toBe('electronics');
    });

    it('throws NotFoundException when missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
