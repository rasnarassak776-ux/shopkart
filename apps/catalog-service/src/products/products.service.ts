import {
  BadRequestException,
  ConflictException,
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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  QueryAdminProductsDto,
  AdminProductSortField,
  AdminProductSortOrder,
} from './dto/query-admin-products.dto';

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

  // ---------------- Customer-facing Public APIs ----------------

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

  // ---------------- Admin Product Management ----------------

  async generateUniqueSlug(
    name: string,
    excludeProductId?: string,
  ): Promise<string> {
    const baseSlug = this.slugify(name) || 'product';
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          slug: candidate,
          ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
      candidate = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private buildAdminWhere(
    query: QueryAdminProductsDto,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildAdminOrderBy(
    sortBy?: AdminProductSortField,
    sortOrder?: AdminProductSortOrder,
  ): Prisma.ProductOrderByWithRelationInput[] {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'name':
        return [{ name: direction }, { id: 'asc' }];
      case 'price':
        return [{ price: direction }, { id: 'asc' }];
      case 'sku':
        return [{ sku: direction }, { id: 'asc' }];
      case 'createdAt':
      default:
        return [{ createdAt: direction }, { id: 'asc' }];
    }
  }

  async findAllForAdmin(query: QueryAdminProductsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where = this.buildAdminWhere(query);

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildAdminOrderBy(query.sortBy, query.sortOrder),
        include: productInclude,
      }),
    ]);

    return {
      data: products.map((p) => {
        const primaryImage =
          p.images.find((img) => img.isPrimary) ?? p.images[0] ?? null;
        return {
          ...p,
          price: p.price.toString(),
          primaryImage,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdForAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: [
            { isPrimary: 'desc' as const },
            { displayOrder: 'asc' as const },
          ],
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const primaryImage =
      product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null;

    return {
      ...product,
      price: product.price.toString(),
      primaryImage,
    };
  }

  async create(dto: CreateProductDto) {
    // 1. Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(
        `Category with ID "${dto.categoryId}" not found`,
      );
    }

    // 2. Prevent duplicate SKU
    const normalizedSku = dto.sku.trim();
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: normalizedSku },
      select: { id: true },
    });
    if (existingSku) {
      throw new ConflictException(
        `A product with SKU "${normalizedSku}" already exists`,
      );
    }

    // 3. Resolve slug safely
    const slug = dto.slug?.trim()
      ? await this.generateUniqueSlug(dto.slug.trim())
      : await this.generateUniqueSlug(dto.name);

    // 4. Decimal price & persist
    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          sku: normalizedSku,
          slug,
          description: dto.description ?? null,
          price: new Prisma.Decimal(dto.price),
          brand: dto.brand?.trim() ?? null,
          categoryId: dto.categoryId,
          isActive: dto.isActive ?? true,
        },
        include: productInclude,
      });

      return {
        ...product,
        price: product.price.toString(),
        primaryImage: null,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta?.target
          : [];
        if (target.includes('sku') || String(error.message).includes('sku')) {
          throw new ConflictException(
            `A product with SKU "${normalizedSku}" already exists`,
          );
        }
        if (target.includes('slug') || String(error.message).includes('slug')) {
          throw new ConflictException('A product with this slug already exists');
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new BadRequestException(
          `Category with ID "${dto.categoryId}" not found`,
        );
      }
    }

    if (dto.sku && dto.sku.trim() !== existing.sku) {
      const duplicateSku = await this.prisma.product.findFirst({
        where: {
          sku: dto.sku.trim(),
          id: { not: id },
        },
        select: { id: true },
      });
      if (duplicateSku) {
        throw new ConflictException(
          `A product with SKU "${dto.sku.trim()}" already exists`,
        );
      }
    }

    let slugToUpdate: string | undefined;
    if (dto.slug !== undefined) {
      slugToUpdate = dto.slug?.trim()
        ? await this.generateUniqueSlug(dto.slug.trim(), id)
        : await this.generateUniqueSlug(dto.name ?? existing.name, id);
    } else if (dto.name && dto.name.trim() !== existing.name) {
      slugToUpdate = await this.generateUniqueSlug(dto.name.trim(), id);
    }

    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.price !== undefined
            ? { price: new Prisma.Decimal(dto.price) }
            : {}),
          ...(dto.brand !== undefined
            ? { brand: dto.brand?.trim() ?? null }
            : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(slugToUpdate !== undefined ? { slug: slugToUpdate } : {}),
        },
        include: productInclude,
      });

      const primaryImage =
        updated.images.find((img) => img.isPrimary) ??
        updated.images[0] ??
        null;

      return {
        ...updated,
        price: updated.price.toString(),
        primaryImage,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta?.target
          : [];
        if (target.includes('sku') || String(error.message).includes('sku')) {
          throw new ConflictException(
            `A product with SKU "${dto.sku}" already exists`,
          );
        }
        if (target.includes('slug') || String(error.message).includes('slug')) {
          throw new ConflictException('A product with this slug already exists');
        }
      }
      throw error;
    }
  }

  async setStatus(id: string, isActive: boolean) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive },
      include: productInclude,
    });

    const primaryImage =
      updated.images.find((img) => img.isPrimary) ??
      updated.images[0] ??
      null;

    return {
      ...updated,
      price: updated.price.toString(),
      primaryImage,
    };
  }

  async delete(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // 1. Never delete products referenced by historical order records
    const orderItemsCount = await this.prisma.orderItem.count({
      where: { productId: id },
    });
    if (orderItemsCount > 0) {
      throw new ConflictException(
        `Cannot delete product "${product.name}": it is referenced by ${orderItemsCount} historical order record(s). Deactivate the product instead to preserve order history.`,
      );
    }

    // 2. Reject deletion if active inventory reservations exist
    const activeReservationsCount =
      await this.prisma.inventoryReservation.count({
        where: {
          productId: id,
          status: { in: ['RESERVED', 'CONFIRMED'] },
        },
      });
    if (activeReservationsCount > 0) {
      throw new ConflictException(
        `Cannot delete product "${product.name}": it has ${activeReservationsCount} active inventory reservation(s). Deactivate the product instead.`,
      );
    }

    // 3. Reject deletion if active physical inventory exists
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId: id },
    });
    if (
      inventory &&
      (inventory.availableQuantity > 0 || inventory.reservedQuantity > 0)
    ) {
      throw new ConflictException(
        `Cannot delete product "${product.name}": it has active stock in inventory (available: ${inventory.availableQuantity}, reserved: ${inventory.reservedQuantity}). Adjust inventory to 0 or deactivate the product.`,
      );
    }

    // 4. Safe atomic deletion of product and non-order dependencies
    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.inventoryReservation.deleteMany({ where: { productId: id } });
      if (inventory) {
        await tx.inventory.delete({ where: { productId: id } });
      }
      await tx.product.delete({ where: { id } });
    });

    return {
      success: true,
      message: `Product "${product.name}" deleted successfully`,
      id,
    };
  }
}
