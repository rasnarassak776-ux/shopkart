import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
