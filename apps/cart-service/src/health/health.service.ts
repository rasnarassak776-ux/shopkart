import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth() {
    const isDbHealthy = await this.prisma.isHealthy();

    return {
      status: isDbHealthy ? 'ok' : 'degraded',
      service: 'cart-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: isDbHealthy ? 'connected' : 'disconnected',
      },
    };
  }

  async verifyDatabaseIntegration() {
    const isDbHealthy = await this.prisma.isHealthy();
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      return {
        success: isDbHealthy,
        service: 'cart-service',
        timestamp: new Date().toISOString(),
        database: isDbHealthy ? 'connected' : 'disconnected',
        message: 'Detailed database metrics are restricted in production environment.',
      };
    }

    let cartCount = 0;
    let cartItemCount = 0;
    let queryError: string | null = null;

    if (isDbHealthy) {
      try {
        cartCount = await this.prisma.cart.count();
        cartItemCount = await this.prisma.cartItem.count();
      } catch (err: any) {
        queryError = err.message;
      }
    }

    return {
      success: isDbHealthy && queryError === null,
      service: 'cart-service',
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? 'connected' : 'disconnected',
      tables: {
        carts: { totalCount: cartCount },
        cartItems: { totalCount: cartItemCount },
      },
      error: queryError,
    };
  }
}
