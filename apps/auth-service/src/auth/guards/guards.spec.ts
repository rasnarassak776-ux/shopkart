import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@shopkart/common';
import { MerchantsController } from '../../merchants/merchants.controller';
import { AuditLogsController } from '../../audit/audit-logs.controller';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { RolesGuard } from './roles.guard';

function contextFor(controller: any, handler: (...args: unknown[]) => unknown, request: object) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const handlersOf = (controller: any) =>
  Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) => controller.prototype[name]);

describe('superadmin-only controllers', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it.each([MerchantsController, AuditLogsController])('%p requires JWT + superadmin on every handler', (controller) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    for (const handler of handlersOf(controller)) {
      expect(reflector.getAllAndOverride(ROLES_KEY, [handler, controller])).toEqual(['superadmin']);
      expect(guard.canActivate(contextFor(controller, handler, { user: { role: 'superadmin' } }))).toBe(true);
      for (const role of ['merchant', 'customer', undefined]) {
        expect(() => guard.canActivate(contextFor(controller, handler, { user: role && { role } }))).toThrow(
          ForbiddenException,
        );
      }
    }
  });

  it('rate-limits every merchant-management handler, with a stricter limit for creation', () => {
    for (const handler of handlersOf(MerchantsController)) {
      expect(reflector.getAllAndOverride(RATE_LIMIT_KEY, [handler, MerchantsController])).toBeDefined();
    }
    expect(
      reflector.getAllAndOverride(RATE_LIMIT_KEY, [MerchantsController.prototype.create, MerchantsController]),
    ).toMatchObject({ name: 'merchant_create', limit: 10 });
  });
});

describe('RateLimitGuard', () => {
  const counters = new Map<string, number>();
  const client = {
    incr: jest.fn(async (key: string) => {
      counters.set(key, (counters.get(key) ?? 0) + 1);
      return counters.get(key)!;
    }),
    expire: jest.fn(async () => 1),
  };
  const guard = new RateLimitGuard(new Reflector(), { getClient: () => client } as unknown as RedisService);
  const handler = () => undefined;
  Reflect.defineMetadata(RATE_LIMIT_KEY, { name: 'test', limit: 2, windowSeconds: 60 }, handler);

  it('allows requests up to the limit then responds 429, keyed per user', async () => {
    const ctx = contextFor(class {}, handler, { user: { id: 'u1' }, ip: '1.1.1.1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({ status: 429 });
    await expect(guard.canActivate(contextFor(class {}, handler, { user: { id: 'u2' } }))).resolves.toBe(true);
    expect(client.expire).toHaveBeenCalledWith('auth:rate_limit:test:user:u1', 60);
  });

  it('falls back to the client IP for anonymous requests and fails open without Redis', async () => {
    const ctx = contextFor(class {}, handler, { ip: '9.9.9.9' });
    await guard.canActivate(ctx);
    expect(counters.has('auth:rate_limit:test:ip:9.9.9.9')).toBe(true);

    const noRedis = new RateLimitGuard(new Reflector(), { getClient: () => null } as unknown as RedisService);
    await expect(noRedis.canActivate(ctx)).resolves.toBe(true);
  });

  it('is a no-op for handlers without a rate limit', async () => {
    await expect(guard.canActivate(contextFor(class {}, () => undefined, {}))).resolves.toBe(true);
  });
});
