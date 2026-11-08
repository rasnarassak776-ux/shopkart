import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
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
        create: jest.fn(),
        update: jest.fn(),
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

  describe('findAllForAdmin', () => {
    it('returns every category without an active filter', async () => {
      prisma.category.findMany.mockResolvedValue([mockCategory]);

      await service.findAllForAdmin();

      const args = prisma.category.findMany.mock.calls[0][0];
      expect(args.where).toBeUndefined();
      expect(args.include._count.select).toEqual({ products: true, children: true });
    });
  });

  describe('create', () => {
    it('derives the slug from the name and defaults to active', async () => {
      prisma.category.create.mockImplementation(({ data }) => ({ id: 'new', ...data }));

      const result = await service.create({ name: 'Home & Kitchen' });

      expect(prisma.category.create.mock.calls[0][0].data).toEqual({
        name: 'Home & Kitchen',
        slug: 'home-kitchen',
        description: null,
        parentId: null,
        isActive: true,
      });
      expect(result.slug).toBe('home-kitchen');
    });

    it('rejects a parent that does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Phones', parentId: 'missing' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('maps unique slug violations to ConflictException', async () => {
      prisma.category.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create({ name: 'Electronics' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects names that cannot produce a slug', async () => {
      await expect(service.create({ name: '!!!' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue(mockCategory);

      await service.update('cat-1', { description: null });

      expect(prisma.category.update.mock.calls[0][0].data).toEqual({
        description: null,
      });
    });

    it('rejects making a category its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.update('cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects moving a category beneath its own descendant', async () => {
      prisma.category.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'cat-1') return mockCategory;
        if (where.id === 'child') return { parentId: 'cat-1' };
        return null;
      });

      await expect(
        service.update('cat-1', { parentId: 'child' }),
      ).rejects.toThrow(/own subcategories/);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown categories', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setStatus', () => {
    it('toggles isActive', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({ ...mockCategory, isActive: false });

      const result = await service.setStatus('cat-1', false);

      expect(prisma.category.update.mock.calls[0][0].data).toEqual({ isActive: false });
      expect(result.isActive).toBe(false);
    });
  });
});
