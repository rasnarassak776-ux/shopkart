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
      service: 'order-service',
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
        service: 'order-service',
        timestamp: new Date().toISOString(),
        database: isDbHealthy ? 'connected' : 'disconnected',
        message: 'Detailed database metrics are restricted in production environment.',
      };
    }

    let orderCount = 0;
    let orderItemCount = 0;
    let paymentCount = 0;
    let statusHistoryCount = 0;
    let queryError: string | null = null;

    if (isDbHealthy) {
      try {
        orderCount = await this.prisma.order.count();
        orderItemCount = await this.prisma.orderItem.count();
        paymentCount = await this.prisma.payment.count();
        statusHistoryCount = await this.prisma.orderStatusHistory.count();
      } catch (err: any) {
        queryError = err.message;
      }
    }

    return {
      success: isDbHealthy && queryError === null,
      service: 'order-service',
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? 'connected' : 'disconnected',
      tables: {
        orders: { totalCount: orderCount },
        orderItems: { totalCount: orderItemCount },
        payments: { totalCount: paymentCount },
        orderStatusHistory: { totalCount: statusHistoryCount },
      },
      error: queryError,
    };
  }
}
