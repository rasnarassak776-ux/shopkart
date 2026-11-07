import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  QueryProductsDto,
  ProductSortField,
  ProductSortOrder,
} from './dto/query-products.dto';

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

  private buildWhere(query: QueryProductsDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      // Customer-facing listing always excludes inactive products.
      isActive: true,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.brand) {
      where.brand = { equals: query.brand, mode: 'insensitive' };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildOrderBy(
    sortBy?: ProductSortField,
    sortOrder?: ProductSortOrder,
  ): Prisma.ProductOrderByWithRelationInput[] {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'price':
        return [{ price: direction }, { id: 'asc' }];
      case 'name':
        return [{ name: direction }, { id: 'asc' }];
      case 'createdAt':
      default:
        return [{ createdAt: direction }, { id: 'asc' }];
    }
  }

  async findAll(query: QueryProductsDto) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        'minPrice must not be greater than maxPrice',
      );
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 12;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(query.sortBy, query.sortOrder),
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

  /** Distinct brands across active products, for filter UI options. */
  async findBrands(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows
      .map((row) => row.brand)
      .filter((brand): brand is string => Boolean(brand));
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
