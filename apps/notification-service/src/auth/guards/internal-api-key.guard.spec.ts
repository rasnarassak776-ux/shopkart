import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalApiKeyGuard } from './internal-api-key.guard';

describe('InternalApiKeyGuard', () => {
  let guard: InternalApiKeyGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('valid-secret-key-123'),
    } as any;
    guard = new InternalApiKeyGuard(configService);
  });

  const createMockContext = (headers: Record<string, string>, user?: any) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        user,
      }),
    }),
  });

  it('allows access with valid X-Internal-Api-Key header', () => {
    const ctx = createMockContext({ 'x-internal-api-key': 'valid-secret-key-123' }) as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects access when header is missing and user is not superadmin', () => {
    const ctx = createMockContext({}) as any;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('rejects access when header key does not match', () => {
    const ctx = createMockContext({ 'x-internal-api-key': 'wrong-key' }) as any;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows superadmin user without internal api key', () => {
    const ctx = createMockContext({}, { role: 'superadmin' }) as any;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
