import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const client = this.redisService.getClient();
    // Fail open when Redis is unavailable, consistent with the rest of the auth service.
    if (!options || !client) return true;

    const req = context.switchToHttp().getRequest();
    const identity = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`;
    const key = `auth:rate_limit:${options.name}:${identity}`;

    let count: number;
    try {
      count = await client.incr(key);
      if (count === 1) await client.expire(key, options.windowSeconds);
    } catch (err) {
      this.logger.warn(`Rate limit check failed: ${(err as Error).message}`);
      return true;
    }

    if (count > options.limit) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
