import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@shopkart/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import { PrismaService } from '../prisma/prisma.service';

function contextFor(handler: (...args: unknown[]) => unknown, user?: object) {
  return {
    getHandler: () => handler,
    getClass: () => AdminController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('AdminController authorization', () => {
  const reflector = new Reflector();
  const rolesGuard = new RolesGuard(reflector);
  const handlers = Object.getOwnPropertyNames(AdminController.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => (AdminController.prototype as any)[name]);

  it('applies JwtAuthGuard and RolesGuard at class level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('requires the admin or superadmin role on every handler and none are public', () => {
    expect(handlers.length).toBeGreaterThan(0);
    for (const handler of handlers) {
      expect(
        reflector.getAllAndOverride(ROLES_KEY, [handler, AdminController]),
      ).toEqual(['admin', 'superadmin']);
      expect(
        reflector.getAllAndOverride(IS_PUBLIC_KEY, [handler, AdminController]),
      ).toBeFalsy();
    }
  });

  it('allows admins and superadmins', () => {
    for (const handler of handlers) {
      expect(rolesGuard.canActivate(contextFor(handler, { role: 'admin' }))).toBe(true);
      expect(rolesGuard.canActivate(contextFor(handler, { role: 'superadmin' }))).toBe(true);
    }
  });

  it('rejects customers and anonymous requests with 403', () => {
    for (const handler of handlers) {
      expect(() =>
        rolesGuard.canActivate(contextFor(handler, { role: 'customer' })),
      ).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(contextFor(handler))).toThrow(
        ForbiddenException,
      );
    }
  });
});

describe('CreateCategoryDto validation', () => {
  const errorsFor = async (body: object) =>
    (await validate(plainToInstance(CreateCategoryDto, body))).map((e) => e.property);

  it('trims and accepts a valid payload, normalising blanks to null', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '  Phones  ',
      slug: '',
      description: '   ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ name: 'Phones', slug: null, description: null });
  });

  it('rejects missing names, invalid slugs and non-UUID parents', async () => {
    expect(await errorsFor({ name: '   ' })).toContain('name');
    expect(await errorsFor({ name: 'A', slug: 'Bad Slug' })).toContain('slug');
    expect(await errorsFor({ name: 'A', parentId: 'nope' })).toContain('parentId');
  });
});

describe('AdminStatsService', () => {
  it('derives inactive counts from real totals', async () => {
    const prisma = {
      product: { count: jest.fn() },
      category: { count: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([10, 7, 5, 4]),
    };
    const service = new AdminStatsService(prisma as unknown as PrismaService);

    await expect(service.getCatalogStats()).resolves.toEqual({
      products: { total: 10, active: 7, inactive: 3 },
      categories: { total: 5, active: 4, inactive: 1 },
    });
  });
});
