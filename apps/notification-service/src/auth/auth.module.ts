import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
  ],
  providers: [JwtStrategy, JwtAuthGuard, InternalApiKeyGuard],
  exports: [PassportModule, JwtAuthGuard, InternalApiKeyGuard],
})
export class AuthModule {}
