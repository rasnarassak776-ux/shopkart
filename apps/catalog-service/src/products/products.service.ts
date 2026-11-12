import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@shopkart/common';
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
import {
  StorageService,
  StoredFileResult,
} from '../storage/storage.interface';
import {
  MAX_IMAGES_PER_REQUEST,
  validateImageFile,
} from '../storage/file-validation';

const productInclude = {
  category: {
    select: { id: true, name: true, slug: true },
  },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { displayOrder: 'asc' as const }],
  },
};

/** Authenticated console caller. `id` is the merchant's user id from the JWT. */
export interface ConsoleActor {
  id: string;
  role: string;
}

/** Callers without an actor context (tests, internal jobs) get platform-wide access. */
const PLATFORM_ACTOR: ConsoleActor = { id: '', role: UserRole.SUPERADMIN };

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService?: StorageService,
  ) {}

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
      // Customer-facing listing always excludes inactive and out-of-stock products.
      isActive: true,
      outOfStock: false,
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

    if (!product || !product.isActive || product.outOfStock) {
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

    if (!product || !product.isActive || product.outOfStock) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return {
      ...product,
      price: product.price.toString(),
    };
  }

  // ---------------- Admin Product Management ----------------

  /** Merchants are confined to their own products; superadmins see everything. */
  private isPlatformAdmin(actor: ConsoleActor): boolean {
    return actor.role === UserRole.SUPERADMIN;
  }

  private scopeWhere(actor: ConsoleActor): Prisma.ProductWhereInput {
    return this.isPlatformAdmin(actor) ? {} : { merchantId: actor.id };
  }

  /**
   * Loads a product and verifies the actor may manage it. Returns 404 (not 403)
   * for foreign products so merchants cannot enumerate other merchants' catalog.
   */
  private async getManageableProductOrThrow(id: string, actor: ConsoleActor) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, sku: true, categoryId: true, merchantId: true },
    });
    if (
      !product ||
      (!this.isPlatformAdmin(actor) && product.merchantId !== actor.id)
    ) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

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

  async findAllForAdmin(query: QueryAdminProductsDto, actor: ConsoleActor = PLATFORM_ACTOR) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...this.buildAdminWhere(query),
      ...this.scopeWhere(actor),
      // Only superadmins may filter by an arbitrary merchant id.
      ...(this.isPlatformAdmin(actor) && query.merchantId
        ? { merchantId: query.merchantId }
        : {}),
    };

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

  async findByIdForAdmin(id: string, actor: ConsoleActor = PLATFORM_ACTOR) {
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

    if (
      !product ||
      (!this.isPlatformAdmin(actor) && product.merchantId !== actor.id)
    ) {
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

  async create(dto: CreateProductDto, actor: ConsoleActor = PLATFORM_ACTOR) {
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
          // Ownership always comes from the authenticated caller. A merchant
          // can never assign a product to another merchant; only a superadmin
          // may optionally set merchantId explicitly.
          merchantId: this.isPlatformAdmin(actor) ? dto.merchantId ?? null : actor.id,
          isActive: dto.isActive ?? true,
          outOfStock: true,
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

  async update(id: string, dto: UpdateProductDto, actor: ConsoleActor = PLATFORM_ACTOR) {
    const existing = await this.getManageableProductOrThrow(id, actor);

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

  async setStatus(id: string, isActive: boolean, actor: ConsoleActor = PLATFORM_ACTOR) {
    await this.getManageableProductOrThrow(id, actor);

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

  async delete(id: string, actor: ConsoleActor = PLATFORM_ACTOR) {
    const product = await this.getManageableProductOrThrow(id, actor);

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

  // ---------------- Product Images Management ----------------

  async uploadImages(
    productId: string,
    files: Array<{
      buffer?: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    }>,
    actor: ConsoleActor = PLATFORM_ACTOR,
  ) {
    const product = await this.getManageableProductOrThrow(productId, actor);

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file must be provided');
    }

    if (files.length > MAX_IMAGES_PER_REQUEST) {
      throw new BadRequestException(
        `Maximum ${MAX_IMAGES_PER_REQUEST} files can be uploaded per request`,
      );
    }

    const validatedFiles = files.map((file) => validateImageFile(file));

    if (!this.storageService) {
      throw new BadRequestException('Storage service is not available');
    }

    // Check existing images to determine next displayOrder and whether a primary image already exists
    const existingImages = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ displayOrder: 'asc' }],
    });

    const hasPrimary = existingImages.some((img) => img.isPrimary);
    const maxOrder =
      existingImages.length > 0
        ? Math.max(...existingImages.map((img) => img.displayOrder))
        : -1;
    const nextDisplayOrder = maxOrder + 1;

    // Save files to local storage, keeping track of saved filenames for cleanup on error
    const savedFiles: StoredFileResult[] = [];
    try {
      for (const file of validatedFiles) {
        const stored = await this.storageService.saveFile({
          buffer: file.buffer,
          originalName: file.originalName,
          mimeType: file.mimeType,
        });
        savedFiles.push(stored);
      }

      // Save records in Prisma transaction
      const createdImages = await this.prisma.$transaction(async (tx) => {
        const records: Array<Prisma.ProductImageGetPayload<object>> = [];
        for (let i = 0; i < savedFiles.length; i++) {
          const stored = savedFiles[i];
          const isPrimary = !hasPrimary && i === 0;
          const record = await tx.productImage.create({
            data: {
              productId,
              imageUrl: stored.url,
              altText: `${product.name} image ${nextDisplayOrder + i + 1}`,
              displayOrder: nextDisplayOrder + i,
              isPrimary,
            },
          });
          records.push(record);
        }
        return records;
      });

      return createdImages;
    } catch (error) {
      // Ensure a failed database operation does not leave uploaded files orphaned
      for (const saved of savedFiles) {
        await this.storageService.deleteFile(saved.filename).catch(() => {});
      }
      throw error;
    }
  }

  async deleteImage(productId: string, imageId: string, actor: ConsoleActor = PLATFORM_ACTOR) {
    await this.getManageableProductOrThrow(productId, actor);

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException(
        `Image with ID "${imageId}" not found for product "${productId}"`,
      );
    }

    // If the deleted image was primary, automatically find the next available image to promote
    const nextPrimary = image.isPrimary
      ? await this.prisma.productImage.findFirst({
          where: { productId, id: { not: imageId } },
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        })
      : null;

    // Database deletion + primary promotion in transaction
    await this.prisma.$transaction(async (tx) => {
      if (nextPrimary) {
        await tx.productImage.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
      }
      await tx.productImage.delete({
        where: { id: imageId },
      });
    });

    // Delete the local file only AFTER database deletion succeeds
    if (this.storageService && image.imageUrl) {
      const match = image.imageUrl.match(
        /\/api\/v1\/catalog\/images\/([a-zA-Z0-9_.-]+)$/,
      );
      if (match) {
        await this.storageService.deleteFile(match[1]).catch(() => {});
      }
    }

    return {
      success: true,
      message: 'Product image deleted successfully',
      imageId,
      promotedPrimaryImageId: nextPrimary?.id ?? null,
    };
  }

  async setPrimaryImage(productId: string, imageId: string, actor: ConsoleActor = PLATFORM_ACTOR) {
    await this.getManageableProductOrThrow(productId, actor);

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException(
        `Image with ID "${imageId}" not found for product "${productId}"`,
      );
    }

    // Set all sibling images to isPrimary: false, and target image to isPrimary: true
    const [_, updated] = await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return updated;
  }
}
