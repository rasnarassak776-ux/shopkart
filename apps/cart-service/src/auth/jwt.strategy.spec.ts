import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtPayload } from '@shopkart/common';
import * as jwt from 'jsonwebtoken';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const secretKey = 'test_secret_for_testing_purposes_only';
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return secretKey;
      if (key === 'JWT_ISSUER') return 'shopkart-auth-service';
      if (key === 'JWT_AUDIENCE') return 'shopkart-client';
      return null;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfigService);
  });

  it('should validate and extract user identity from jwt payload', async () => {
    const payload: JwtPayload = {
      sub: 'user-uuid-1234',
      email: 'customer@example.com',
      role: 'customer',
      iat: 1234567890,
      exp: 1234569999,
    };

    const result = await strategy.validate(payload);
    expect(result).toEqual({
      id: 'user-uuid-1234',
      email: 'customer@example.com',
      role: 'customer',
    });
  });

  it('should throw UnauthorizedException if sub is missing in payload', async () => {
    const payload = {
      email: 'customer@example.com',
      role: 'customer',
    } as any;

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should fail startup in production if JWT_ACCESS_SECRET is insecure default', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const insecureConfigService = {
      get: jest.fn().mockReturnValue('default_jwt_secret'),
    } as unknown as ConfigService;

    expect(() => new JwtStrategy(insecureConfigService)).toThrow(
      /JWT_ACCESS_SECRET must be configured with a secure value in production/,
    );

    process.env.NODE_ENV = originalEnv;
  });

  describe('Auth Service Token Compatibility (passport-jwt verification)', () => {
    it('should successfully verify and authenticate a token signed by Auth Service', (done) => {
      // Create a token exactly matching Auth Service TokenService.generateTokenPair
      const token = jwt.sign(
        {
          sub: 'auth-user-999',
          email: 'verified@shopkart.com',
          role: 'CUSTOMER',
          jti: 'session-jti-123',
        },
        secretKey,
        {
          algorithm: 'HS256',
          issuer: 'shopkart-auth-service',
          audience: 'shopkart-client',
          expiresIn: '15m',
        },
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      // passport strategy defines success and fail methods
      (strategy as any).success = (user: any) => {
        expect(user).toEqual({
          id: 'auth-user-999',
          email: 'verified@shopkart.com',
          role: 'CUSTOMER',
        });
        done();
      };

      (strategy as any).fail = (challenge: any, status: any) => {
        done(new Error(`Authentication failed unexpectedly: ${challenge} (${status})`));
      };

      (strategy as any).error = (err: any) => {
        done(err);
      };

      strategy.authenticate(mockReq as any, {});
    });

    it('should reject a token with incorrect issuer', (done) => {
      const token = jwt.sign(
        {
          sub: 'auth-user-999',
          email: 'verified@shopkart.com',
          role: 'CUSTOMER',
        },
        secretKey,
        {
          algorithm: 'HS256',
          issuer: 'foreign-auth-service', // Wrong issuer
          audience: 'shopkart-client',
          expiresIn: '15m',
        },
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      (strategy as any).success = () => {
        done(new Error('Should not have succeeded with wrong issuer'));
      };

      (strategy as any).fail = (challenge: any) => {
        expect(challenge).toBeDefined();
        done();
      };

      strategy.authenticate(mockReq as any, {});
    });

    it('should reject a token with incorrect audience', (done) => {
      const token = jwt.sign(
        {
          sub: 'auth-user-999',
          email: 'verified@shopkart.com',
          role: 'CUSTOMER',
        },
        secretKey,
        {
          algorithm: 'HS256',
          issuer: 'shopkart-auth-service',
          audience: 'foreign-audience', // Wrong audience
          expiresIn: '15m',
        },
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      (strategy as any).success = () => {
        done(new Error('Should not have succeeded with wrong audience'));
      };

      (strategy as any).fail = (challenge: any) => {
        expect(challenge).toBeDefined();
        done();
      };

      strategy.authenticate(mockReq as any, {});
    });

    it('should reject a token signed with wrong secret', (done) => {
      const token = jwt.sign(
        {
          sub: 'auth-user-999',
          email: 'verified@shopkart.com',
          role: 'CUSTOMER',
        },
        'wrong_secret_key_12345678901234567890',
        {
          algorithm: 'HS256',
          issuer: 'shopkart-auth-service',
          audience: 'shopkart-client',
          expiresIn: '15m',
        },
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      (strategy as any).success = () => {
        done(new Error('Should not have succeeded with wrong secret'));
      };

      (strategy as any).fail = (challenge: any) => {
        expect(challenge).toBeDefined();
        done();
      };

      strategy.authenticate(mockReq as any, {});
    });
  });
});
