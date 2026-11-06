import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@shopkart/common';
import { Request } from 'express';
import { TokenService } from '../services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService?.get<string>('JWT_ACCESS_SECRET') ||
        process.env.JWT_ACCESS_SECRET ||
        'default_jwt_secret',
      issuer:
        configService?.get<string>('JWT_ISSUER') ||
        process.env.JWT_ISSUER ||
        'shopkart-auth-service',
      audience:
        configService?.get<string>('JWT_AUDIENCE') ||
        process.env.JWT_AUDIENCE ||
        'shopkart-client',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // 1. Check blacklist (e.g. from logout)
    if (rawToken) {
      const isBlacklisted = await this.tokenService.isTokenBlacklisted(rawToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked. Please sign in again.');
      }
    }

    // 2. Check user-level revocation timestamp (e.g. from password change, password reset, session wipe)
    if (payload.iat && payload.sub) {
      const revokedBefore = await this.tokenService.getUserRevokedBefore(payload.sub);
      if (revokedBefore && payload.iat <= revokedBefore) {
        throw new UnauthorizedException(
          'Token has been revoked due to recent security credentials update. Please sign in again.',
        );
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
