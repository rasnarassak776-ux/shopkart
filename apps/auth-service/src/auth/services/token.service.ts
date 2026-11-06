import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '@shopkart/common';
import * as crypto from 'crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly refreshTtlSeconds = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      process.env.JWT_ACCESS_SECRET ||
      'default_jwt_secret';
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      process.env.JWT_REFRESH_SECRET ||
      'default_jwt_refresh_secret';
    this.accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    this.refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    this.issuer =
      this.configService.get<string>('JWT_ISSUER') ||
      process.env.JWT_ISSUER ||
      'shopkart-auth-service';
    this.audience =
      this.configService.get<string>('JWT_AUDIENCE') ||
      process.env.JWT_AUDIENCE ||
      'shopkart-client';
  }

  async generateTokenPair(user: {
    id: string;
    email: string;
    role: { name: string };
  }): Promise<TokenPair> {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    // Guard against same-second clock edge case with revoked_before timestamp
    let nowSec = Math.floor(Date.now() / 1000);
    const revokedBefore = await this.getUserRevokedBefore(user.id);
    if (revokedBefore && nowSec <= revokedBefore) {
      nowSec = revokedBefore + 1;
    }

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      jti: accessJti,
      iat: nowSec,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshJti,
      iat: nowSec,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload as any, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn,
        issuer: this.issuer,
        audience: this.audience,
      }),
      this.jwtService.signAsync(refreshPayload as any, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn,
        issuer: this.issuer,
        audience: this.audience,
      }),
    ]);

    // Register active session in Redis
    await this.registerRefreshTokenSession(user.id, refreshJti, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async registerRefreshTokenSession(
    userId: string,
    jti: string,
    refreshToken: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) {
      return;
    }

    try {
      const key = `auth:session:${userId}:${jti}`;
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      await client.set(key, tokenHash, 'EX', this.refreshTtlSeconds);
    } catch (err) {
      this.logger.warn(`Failed to store refresh token in Redis: ${(err as Error).message}`);
    }
  }

  /**
   * Atomically validates, consumes, and rotates a refresh token via Redis Lua script.
   * Completely eliminates concurrency race conditions (only 1 simultaneous request can succeed).
   */
  async consumeRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.refreshSecret,
          issuer: this.issuer,
          audience: this.audience,
        },
      );
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const client = this.redisService.getClient();
    if (!client) {
      return payload;
    }

    const sessionKey = `auth:session:${payload.sub}:${payload.jti}`;
    const revokedKey = `auth:revoked:${payload.sub}:${payload.jti}`;
    const incomingHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Atomic conditional consumption Lua script
    const luaScript = `
      local sessionKey = KEYS[1]
      local revokedKey = KEYS[2]
      local expectedHash = ARGV[1]
      local reason = ARGV[2]
      local ttl = tonumber(ARGV[3])

      -- 1. Check if already revoked
      local isRevoked = redis.call('GET', revokedKey)
      if isRevoked then
        return 'REUSED'
      end

      -- 2. Check active session
      local storedHash = redis.call('GET', sessionKey)
      if not storedHash then
        return 'NOT_FOUND'
      end

      -- 3. Verify hash match
      if storedHash ~= expectedHash then
        return 'HASH_MISMATCH'
      end

      -- 4. Atomically delete active session and mark as revoked
      redis.call('DEL', sessionKey)
      redis.call('SET', revokedKey, reason, 'EX', ttl)

      return 'OK'
    `;

    const result = (await client.eval(
      luaScript,
      2,
      sessionKey,
      revokedKey,
      incomingHash,
      'rotated',
      this.refreshTtlSeconds,
    )) as string;

    if (result === 'REUSED' || result === 'HASH_MISMATCH') {
      this.logger.warn(
        `Security Alert: Refresh token reuse detected for user ${payload.sub}, jti ${payload.jti}. Revoking all sessions.`,
      );
      await this.revokeAllUserSessions(payload.sub);
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked.',
      );
    }

    if (result === 'NOT_FOUND') {
      throw new UnauthorizedException('Refresh token session has been revoked.');
    }

    return payload;
  }

  async validateRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    return this.consumeRefreshToken(refreshToken);
  }

  async revokeSession(userId: string, jti: string, reason = 'rotated'): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) {
      return;
    }

    try {
      const activeKey = `auth:session:${userId}:${jti}`;
      const revokedKey = `auth:revoked:${userId}:${jti}`;
      // Atomic multi execution
      await client
        .multi()
        .del(activeKey)
        .set(revokedKey, reason, 'EX', this.refreshTtlSeconds)
        .exec();
    } catch (err) {
      this.logger.warn(`Failed to revoke session: ${(err as Error).message}`);
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) {
      return;
    }

    try {
      const pattern = `auth:session:${userId}:*`;
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }

      // Invalidate all active access tokens issued at or before this instant (15-min TTL window)
      const nowSec = Math.floor(Date.now() / 1000);
      await client.set(`auth:revoked_before:${userId}`, nowSec.toString(), 'EX', 900);
    } catch (err) {
      this.logger.warn(`Failed to revoke all user sessions: ${(err as Error).message}`);
    }
  }

  async getUserRevokedBefore(userId: string): Promise<number | null> {
    const client = this.redisService.getClient();
    if (!client || !userId) {
      return null;
    }

    try {
      const val = await client.get(`auth:revoked_before:${userId}`);
      return val ? parseInt(val, 10) : null;
    } catch (err) {
      this.logger.warn(`Failed to check user revocation threshold: ${(err as Error).message}`);
      return null;
    }
  }

  async blacklistToken(token: string): Promise<void> {
    const client = this.redisService.getClient();
    if (!client || !token) {
      return;
    }

    try {
      const decoded = this.jwtService.decode(token) as { exp?: number };
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = decoded?.exp ? decoded.exp - now : 900; // Default 15m

      if (remainingSeconds > 0) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await client.set(`auth:blacklist:${tokenHash}`, '1', 'EX', remainingSeconds);
      }
    } catch (err) {
      this.logger.warn(`Failed to blacklist token: ${(err as Error).message}`);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const client = this.redisService.getClient();
    if (!client || !token) {
      return false;
    }

    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const isBlacklisted = await client.get(`auth:blacklist:${tokenHash}`);
      return isBlacklisted === '1';
    } catch (err) {
      this.logger.warn(`Failed to check blacklist: ${(err as Error).message}`);
      return false;
    }
  }
}
