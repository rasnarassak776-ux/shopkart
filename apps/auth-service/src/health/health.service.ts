import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async checkHealth() {
    const isDbHealthy = await this.prisma.isHealthy();
    const isRedisHealthy = await this.redis.ping();

    const isHealthy = isDbHealthy;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      checks: {
        database: isDbHealthy ? 'connected' : 'disconnected',
        redis: isRedisHealthy ? 'connected' : 'disconnected',
      },
    };
  }

  async verifyDatabaseIntegration() {
    // 1. Fetch the seeded customer role
    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'customer' },
      select: { id: true, name: true, createdAt: true },
    });

    // 2. Fetch the seeded admin role
    const adminRole = await this.prisma.role.findUnique({
      where: { name: 'admin' },
      select: { id: true, name: true, createdAt: true },
    });

    // 3. Perform a read-only query on users
    const userCount = await this.prisma.user.count();
    const recentUsers = await this.prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // 4. Perform a read-only query on addresses
    const addressCount = await this.prisma.address.count();
    const sampleAddresses = await this.prisma.address.findMany({
      take: 5,
      select: {
        id: true,
        city: true,
        state: true,
        country: true,
        isDefault: true,
      },
    });

    return {
      success: !!(customerRole && adminRole),
      timestamp: new Date().toISOString(),
      roles: {
        customerRoleFound: !!customerRole,
        customerRole: customerRole || null,
        adminRoleFound: !!adminRole,
        adminRole: adminRole || null,
      },
      users: {
        totalCount: userCount,
        sampleRecords: recentUsers,
      },
      addresses: {
        totalCount: addressCount,
        sampleRecords: sampleAddresses,
      },
    };
  }
}
