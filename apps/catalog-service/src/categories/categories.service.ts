import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const adminCategoryInclude = {
  parent: { select: { id: true, name: true, isActive: true } },
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(includeInactive = false) {
    const activeFilter = includeInactive ? {} : { isActive: true };

    return this.prisma.category.findMany({
      where: {
        ...activeFilter,
        parentId: null,
      },
      orderBy: { name: 'asc' },
      include: {
        children: {
          where: activeFilter,
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: true,
        parent: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  // ---------------- Admin management ----------------

  /** Flat list of every category (active and inactive) for administration. */
  async findAllForAdmin() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: adminCategoryInclude,
    });
  }

  async findByIdForAdmin(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: adminCategoryInclude,
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = this.resolveSlug(dto.slug, dto.name);
    if (dto.parentId) {
      await this.assertParentExists(dto.parentId);
    }

    return this.persist(() =>
      this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          parentId: dto.parentId ?? null,
          isActive: dto.isActive ?? true,
        },
        include: adminCategoryInclude,
      }),
    );
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findByIdForAdmin(id);
    const data: Prisma.CategoryUncheckedUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.slug !== undefined) {
      data.slug = this.resolveSlug(dto.slug, dto.name ?? existing.name);
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId) await this.assertValidParent(id, dto.parentId);
      data.parentId = dto.parentId;
    }

    return this.persist(() =>
      this.prisma.category.update({
        where: { id },
        data,
        include: adminCategoryInclude,
      }),
    );
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findByIdForAdmin(id);
    return this.prisma.category.update({
      where: { id },
      data: { isActive },
      include: adminCategoryInclude,
    });
  }

  /** Uses the provided slug, or derives one from the name when none is given. */
  private resolveSlug(slug: string | null | undefined, name: string): string {
    const resolved = slug || this.slugify(name);
    if (!resolved) {
      throw new BadRequestException(
        'Unable to derive a URL slug from the category name; please provide one',
      );
    }
    return resolved;
  }

  private async assertParentExists(parentId: string) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) {
      throw new BadRequestException(`Parent category "${parentId}" does not exist`);
    }
  }

  /** Rejects self-parenting and assignments that would create a cycle in the tree. */
  private async assertValidParent(id: string, parentId: string) {
    if (parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    let cursor: string | null = parentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === id) {
        throw new BadRequestException(
          'A category cannot be moved under one of its own subcategories',
        );
      }
      if (visited.has(cursor)) break;
      visited.add(cursor);

      const node: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      if (!node) {
        throw new BadRequestException(`Parent category "${parentId}" does not exist`);
      }
      cursor = node.parentId;
    }
  }

  private async persist<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A category with this slug already exists');
      }
      throw error;
    }
  }
}
