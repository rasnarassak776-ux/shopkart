import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductsDto } from './dto/query-products.dto';

const productInclude = {
  category: {
    select: { id: true, name: true, slug: true },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { displayOrder: 'asc' as const }],
  },
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(query: QueryProductsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.brand) {
      where.brand = { contains: query.brand, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: productInclude,
      }),
    ]);

    return {
      data: products.map((p) => ({
        ...p,
        price: p.price.toString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return {
      ...product,
      price: product.price.toString(),
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return {
      ...product,
      price: product.price.toString(),
    };
  }
}
