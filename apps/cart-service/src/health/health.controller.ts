import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('cart/health')
  async getCartHealth() {
    return this.healthService.checkHealth();
  }

  @Get('health/db-verify')
  async verifyDatabase() {
    return this.healthService.verifyDatabaseIntegration();
  }
}
