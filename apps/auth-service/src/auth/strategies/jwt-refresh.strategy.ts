import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.body?.refreshToken || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService?.get<string>('JWT_REFRESH_SECRET') ||
        process.env.JWT_REFRESH_SECRET ||
        'default_jwt_refresh_secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body?.refreshToken;
    return {
      ...payload,
      refreshToken,
    };
  }
}
