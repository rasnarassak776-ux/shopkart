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
      service: 'catalog-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: isDbHealthy ? 'connected' : 'disconnected',
      },
    };
  }
}
