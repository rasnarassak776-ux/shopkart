import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly validKey: string;

  constructor(private readonly configService: ConfigService) {
    this.validKey =
      this.configService.get<string>('NOTIFICATION_INTERNAL_API_KEY') ||
      process.env.NOTIFICATION_INTERNAL_API_KEY ||
      'shopkart_internal_notification_secret_key_2026';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey =
      request.headers['x-internal-api-key'] ||
      request.headers['x-api-key'] ||
      request.query?.apiKey;

    if (!apiKey) {
      // Check if user is already authenticated via JWT as superadmin or service
      if (request.user?.role === 'superadmin') {
        return true;
      }
      throw new UnauthorizedException('Missing internal API key header (X-Internal-Api-Key)');
    }

    if (apiKey !== this.validKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
