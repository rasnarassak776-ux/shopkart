import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@shopkart/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret =
      configService.get<string>('JWT_ACCESS_SECRET') ||
      process.env.JWT_ACCESS_SECRET;

    if (
      isProduction &&
      (!secret ||
        secret === 'default_jwt_secret' ||
        secret.includes('placeholder'))
    ) {
      throw new Error(
        'JWT_ACCESS_SECRET must be configured with a secure value in production',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: secret || 'default_jwt_secret',
      issuer:
        configService.get<string>('JWT_ISSUER') ||
        process.env.JWT_ISSUER ||
        'shopkart-auth-service',
      audience:
        configService.get<string>('JWT_AUDIENCE') ||
        process.env.JWT_AUDIENCE ||
        'shopkart-client',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
