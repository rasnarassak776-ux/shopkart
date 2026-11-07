import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow activation if route is marked as public', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException in handleRequest if user is missing', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('should return user in handleRequest if user is authenticated', () => {
    const user = { id: 'u-1', email: 'test@example.com' };
    expect(guard.handleRequest(null, user)).toEqual(user);
  });
});
