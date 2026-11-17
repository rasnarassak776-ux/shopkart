
import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "../../redis/redis.service";
import { JwtPayload } from "@shopkart/common";
import * as crypto from "crypto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  generation: number;
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

  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.accessSecret =
      this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");

    this.refreshSecret =
      this.configService.getOrThrow<string>("JWT_REFRESH_SECRET");

    this.accessExpiresIn =
      this.configService.get<string>("JWT_ACCESS_EXPIRATION") ||
      "15m";

    this.refreshExpiresIn =
      this.configService.get<string>("JWT_REFRESH_EXPIRATION") ||
      "7d";

    this.issuer =
      this.configService.get<string>("JWT_ISSUER") ||
      process.env.JWT_ISSUER ||
      "shopkart-auth-service";

    this.audience =
      this.configService.get<string>("JWT_AUDIENCE") ||
      process.env.JWT_AUDIENCE ||
      "shopkart-client";

    this.accessTtlSeconds = this.parseDuration(
      this.accessExpiresIn,
    );

    this.refreshTtlSeconds = this.parseDuration(
      this.refreshExpiresIn,
    );
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value);

    if (!match) {
      throw new Error(
        `Invalid JWT expiration configuration: ${value}`,
      );
    }

    const factors: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const seconds = Number(match[1]) * factors[match[2]];

    if (
      !Number.isSafeInteger(seconds) ||
      seconds <= 0
    ) {
      throw new Error("Invalid JWT expiration duration.");
    }

    return seconds;
  }

  private requireRedis() {
    const client = this.redisService.getClient();

    if (!client || !this.redisService.isReady()) {
      throw new ServiceUnavailableException(
        "Authentication session storage is temporarily unavailable.",
      );
    }

    return client;
  }

  private hashToken(token: string): string {
    return crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
  }

  async getSessionGeneration(
    userId: string,
  ): Promise<number> {
    if (!userId) {
      throw new UnauthorizedException(
        "Invalid user identifier.",
      );
    }

    const client = this.requireRedis();

    try {
      const value = await client.get(
        `auth:generation:${userId}`,
      );

      if (value === null) {
        return 0;
      }

      if (!/^\d+$/.test(value)) {
        throw new Error("Invalid session generation.");
      }

      const generation = Number(value);

      if (!Number.isSafeInteger(generation)) {
        throw new Error("Invalid session generation.");
      }

      return generation;
    } catch (err) {
      this.logger.error(
        `Failed to read session generation: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Session verification is temporarily unavailable.",
      );
    }
  }

  async generateTokenPair(user: {
    id: string;
    email: string;
    role: { name: string };
  }): Promise<TokenPair> {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const nowSec = Math.floor(Date.now() / 1000);

    const generation = await this.getSessionGeneration(
      user.id,
    );

    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      jti: accessJti,
      generation,
      iat: nowSec,
    } as JwtPayload & { generation: number };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshJti,
      generation,
      iat: nowSec,
    };

    const [accessToken, refreshToken] =
      await Promise.all([
        this.jwtService.signAsync(
          accessPayload as any,
          {
            secret: this.accessSecret,
            expiresIn: this.accessExpiresIn,
            issuer: this.issuer,
            audience: this.audience,
          },
        ),

        this.jwtService.signAsync(
          refreshPayload as any,
          {
            secret: this.refreshSecret,
            expiresIn: this.refreshExpiresIn,
            issuer: this.issuer,
            audience: this.audience,
          },
        ),
      ]);

    await this.registerRefreshTokenSession(
      user.id,
      refreshJti,
      refreshToken,
      generation,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async registerRefreshTokenSession(
    userId: string,
    jti: string,
    refreshToken: string,
    expectedGeneration?: number,
  ): Promise<void> {
    if (!userId || !jti || !refreshToken) {
      throw new UnauthorizedException(
        "Invalid refresh session.",
      );
    }

    const client = this.requireRedis();

    // Support callers that do not supply the generation,
    // while checking the current generation atomically.
    const generation =
      expectedGeneration ??
      (await this.getSessionGeneration(userId));

    if (
      !Number.isSafeInteger(generation) ||
      generation < 0
    ) {
      throw new UnauthorizedException(
        "Invalid session generation.",
      );
    }

    const sessionKey =
      `auth:session:${userId}:${jti}`;

    const generationKey =
      `auth:generation:${userId}`;

    const tokenHash = this.hashToken(refreshToken);

    const script = `
      local generationKey = KEYS[1]
      local sessionKey = KEYS[2]

      local expected = tonumber(ARGV[1])
      local tokenHash = ARGV[2]
      local ttl = tonumber(ARGV[3])

      local current = redis.call(
        'GET',
        generationKey
      )

      if not current then
        current = '0'
      end

      if not string.match(current, '^%d+$') then
        return 'INVALID_GENERATION'
      end

      if tonumber(current) ~= expected then
        return 'STALE_GENERATION'
      end

      local result = redis.call(
        'SET',
        sessionKey,
        tokenHash,
        'EX',
        ttl,
        'NX'
      )

      if result == 'OK' then
        return 'OK'
      end

      return 'SESSION_EXISTS'
    `;

    let result: unknown;

    try {
      result = await client.eval(
        script,
        2,
        generationKey,
        sessionKey,
        String(generation),
        tokenHash,
        String(this.refreshTtlSeconds),
      );
    } catch (err) {
      this.logger.error(
        `Failed to register refresh session: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Authentication session storage is temporarily unavailable.",
      );
    }

    if (result !== "OK") {
      this.logger.warn(
        `Refresh session registration rejected: ${
          String(result)
        }`,
      );

      throw new ServiceUnavailableException(
        "Authentication session registration failed. Please retry.",
      );
    }
  }

  async consumeRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    if (!refreshToken) {
      throw new UnauthorizedException(
        "Missing refresh token.",
      );
    }

    let payload: RefreshTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(
          refreshToken,
          {
            secret: this.refreshSecret,
            issuer: this.issuer,
            audience: this.audience,
          },
        );
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired refresh token.",
      );
    }

    if (
      !payload.sub ||
      !payload.jti ||
      !Number.isSafeInteger(payload.generation) ||
      payload.generation < 0
    ) {
      throw new UnauthorizedException(
        "Invalid refresh token claims.",
      );
    }

    const client = this.requireRedis();

    const sessionKey =
      `auth:session:${payload.sub}:${payload.jti}`;

    const revokedKey =
      `auth:revoked:${payload.sub}:${payload.jti}`;

    const generationKey =
      `auth:generation:${payload.sub}`;

    const incomingHash =
      this.hashToken(refreshToken);

    const script = `
      local generationKey = KEYS[1]
      local sessionKey = KEYS[2]
      local revokedKey = KEYS[3]

      local expectedGeneration = tonumber(ARGV[1])
      local expectedHash = ARGV[2]
      local ttl = tonumber(ARGV[3])

      local generation = redis.call(
        'GET',
        generationKey
      )

      if not generation then
        generation = '0'
      end

      if not string.match(generation, '^%d+$') then
        return 'INVALID_GENERATION'
      end

      if tonumber(generation) ~= expectedGeneration then
        return 'GENERATION_REVOKED'
      end

      local revoked = redis.call(
        'GET',
        revokedKey
      )

      if revoked then
        return 'REUSED'
      end

      local storedHash = redis.call(
        'GET',
        sessionKey
      )

      if not storedHash then
        return 'NOT_FOUND'
      end

      if storedHash ~= expectedHash then
        return 'HASH_MISMATCH'
      end

      redis.call(
        'DEL',
        sessionKey
      )

      redis.call(
        'SET',
        revokedKey,
        'rotated',
        'EX',
        ttl
      )

      return 'OK'
    `;

    let result: unknown;

    try {
      result = await client.eval(
        script,
        3,
        generationKey,
        sessionKey,
        revokedKey,
        String(payload.generation),
        incomingHash,
        String(this.refreshTtlSeconds),
      );
    } catch (err) {
      this.logger.error(
        `Refresh-token validation failed: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Authentication session validation is temporarily unavailable.",
      );
    }

    if (
      result === "REUSED" ||
      result === "HASH_MISMATCH"
    ) {
      this.logger.warn(
        `Refresh token reuse detected for user ${payload.sub}.`,
      );

      await this.revokeAllUserSessions(
        payload.sub,
      );

      throw new UnauthorizedException(
        "Refresh token reuse detected. All sessions revoked.",
      );
    }

    if (
      result === "GENERATION_REVOKED" ||
      result === "NOT_FOUND"
    ) {
      throw new UnauthorizedException(
        "Refresh token session has been revoked.",
      );
    }

    if (result !== "OK") {
      this.logger.error(
        `Unexpected refresh-token validation result: ${
          String(result)
        }`,
      );

      throw new ServiceUnavailableException(
        "Authentication session validation is temporarily unavailable.",
      );
    }

    return payload;
  }

  async validateRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    return this.consumeRefreshToken(refreshToken);
  }

  async revokeSession(
    userId: string,
    jti: string,
    reason = "rotated",
  ): Promise<void> {
    if (!userId || !jti) {
      throw new UnauthorizedException(
        "Invalid session identifier.",
      );
    }

    const client = this.requireRedis();

    try {
      const result = await client
        .multi()
        .del(
          `auth:session:${userId}:${jti}`,
        )
        .set(
          `auth:revoked:${userId}:${jti}`,
          reason,
          "EX",
          this.refreshTtlSeconds,
        )
        .exec();

      if (
        !result ||
        result.length !== 2 ||
        result[0][0] !== null ||
        result[1][0] !== null ||
        result[1][1] !== "OK"
      ) {
        throw new Error(
          "Redis session revocation transaction failed.",
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to revoke session: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Session revocation is temporarily unavailable.",
      );
    }
  }

  async revokeAllUserSessions(
    userId: string,
  ): Promise<void> {
    if (!userId) {
      throw new UnauthorizedException(
        "Invalid user identifier.",
      );
    }

    const client = this.requireRedis();

    const nowSec = Math.floor(Date.now() / 1000);

    const markerTtl =
      this.accessTtlSeconds + 60;

    const script = `
      local generationKey = KEYS[1]
      local markerKey = KEYS[2]

      local timestamp = ARGV[1]
      local ttl = tonumber(ARGV[2])

      if not ttl or ttl <= 0 then
        return redis.error_reply(
          'Invalid revocation TTL'
        )
      end

      local generationType = redis.call(
        'TYPE',
        generationKey
      )['ok']

      local markerType = redis.call(
        'TYPE',
        markerKey
      )['ok']

      if generationType ~= 'none'
        and generationType ~= 'string' then
        return redis.error_reply(
          'Invalid generation key type'
        )
      end

      if markerType ~= 'none'
        and markerType ~= 'string' then
        return redis.error_reply(
          'Invalid revocation marker type'
        )
      end

      local current = redis.call(
        'GET',
        generationKey
      )

      if current then
        if not string.match(current, '^%d+$') then
          return redis.error_reply(
            'Invalid generation value'
          )
        end

        if #current > 15 then
          return redis.error_reply(
            'Generation counter out of range'
          )
        end
      end

      local marker = redis.call(
        'GET',
        markerKey
      )

      if marker and
        not string.match(marker, '^%d+$') then
        return redis.error_reply(
          'Invalid revocation marker'
        )
      end

      local generation = redis.call(
        'INCR',
        generationKey
      )

      redis.call(
        'SET',
        markerKey,
        timestamp,
        'EX',
        ttl
      )

      return generation
    `;

    try {
      const result = await client.eval(
        script,
        2,
        `auth:generation:${userId}`,
        `auth:revoked_before:${userId}`,
        String(nowSec),
        String(markerTtl),
      );

      if (
        typeof result !== "number" ||
        !Number.isSafeInteger(result) ||
        result < 1
      ) {
        throw new Error(
          "Redis did not confirm session generation update.",
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to revoke all sessions: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Session revocation is temporarily unavailable.",
      );
    }
  }

  async getUserRevokedBefore(
    userId: string,
  ): Promise<number | null> {
    if (!userId) {
      throw new UnauthorizedException(
        "Invalid user identifier.",
      );
    }

    const client = this.requireRedis();

    try {
      const value = await client.get(
        `auth:revoked_before:${userId}`,
      );

      if (value === null) {
        return null;
      }

      if (!/^\d+$/.test(value)) {
        throw new Error(
          "Invalid revocation timestamp.",
        );
      }

      const timestamp = Number(value);

      if (!Number.isSafeInteger(timestamp)) {
        throw new Error(
          "Invalid revocation timestamp.",
        );
      }

      return timestamp;
    } catch (err) {
      this.logger.error(
        `Failed to check revocation threshold: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Token revocation verification is temporarily unavailable.",
      );
    }
  }

  async blacklistToken(
    token: string,
  ): Promise<void> {
    if (!token) {
      throw new UnauthorizedException(
        "Missing token.",
      );
    }

    let payload: { exp?: number };

    try {
      payload =
        await this.jwtService.verifyAsync<{
          exp?: number;
        }>(token, {
          secret: this.accessSecret,
          issuer: this.issuer,
          audience: this.audience,
        });
    } catch {
      throw new UnauthorizedException(
        "Invalid or expired access token.",
      );
    }

    if (!Number.isSafeInteger(payload.exp)) {
      throw new UnauthorizedException(
        "Invalid token expiration.",
      );
    }

    const remainingSeconds =
      payload.exp! -
      Math.floor(Date.now() / 1000);

    if (remainingSeconds <= 0) {
      return;
    }

    const client = this.requireRedis();

    try {
      const tokenHash =
        this.hashToken(token);

      const result = await client.set(
        `auth:blacklist:${tokenHash}`,
        "1",
        "EX",
        remainingSeconds,
      );

      if (result !== "OK") {
        throw new Error(
          "Redis did not confirm blacklist write.",
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to blacklist token: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Token revocation is temporarily unavailable.",
      );
    }
  }

  async isTokenBlacklisted(
    token: string,
  ): Promise<boolean> {
    if (!token) {
      throw new UnauthorizedException(
        "Missing token.",
      );
    }

    const client = this.requireRedis();

    try {
      const tokenHash =
        this.hashToken(token);

      const value = await client.get(
        `auth:blacklist:${tokenHash}`,
      );

      if (
        value !== null &&
        value !== "1"
      ) {
        throw new Error(
          "Invalid blacklist entry.",
        );
      }

      return value === "1";
    } catch (err) {
      this.logger.error(
        `Failed to check token blacklist: ${
          (err as Error).message
        }`,
      );

      throw new ServiceUnavailableException(
        "Token revocation verification is temporarily unavailable.",
      );
    }
  }
}
