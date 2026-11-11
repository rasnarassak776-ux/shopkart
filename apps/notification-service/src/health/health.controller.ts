import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @Public()
  async check() {
    const dbHealthy = await this.prisma.isHealthy();
    const emailHealthy = this.emailService.isHealthy();

    const isHealthy = dbHealthy && emailHealthy;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      details: {
        database: dbHealthy ? 'up' : 'down',
        emailTransport: emailHealthy ? 'ready' : 'offline',
      },
    };
  }
}
