
import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  getLiveness() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    const health = await this.healthService.checkHealth();

    if (
      health.checks.database !== 'connected' ||
      health.checks.redis !== 'connected'
    ) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'auth-service',
        checks: health.checks,
      });
    }

    return {
      status: 'ready',
      service: 'auth-service',
      checks: health.checks,
    };
  }

  @Get()
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('db-verify')
  async verifyDatabase() {
    return this.healthService.verifyDatabaseIntegration();
  }
}
