
import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const healthService = {
    checkHealth: jest.fn(),
    verifyDatabaseIntegration: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: healthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns an OK liveness response', () => {
    const result = controller.getLiveness();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('auth-service');
    expect(result.timestamp).toBeDefined();
    expect(healthService.checkHealth).not.toHaveBeenCalled();
  });

  it('returns ready when PostgreSQL and Redis are healthy', async () => {
    healthService.checkHealth.mockResolvedValue({
      status: 'ok',
      checks: {
        database: 'connected',
        redis: 'connected',
      },
    });

    await expect(controller.getReadiness()).resolves.toMatchObject({
      status: 'ready',
      checks: {
        database: 'connected',
        redis: 'connected',
      },
    });
  });

  it.each([
    ['disconnected', 'connected'],
    ['connected', 'disconnected'],
    ['disconnected', 'disconnected'],
  ])(
    'returns 503 when database=%s and redis=%s',
    async (database, redis) => {
      healthService.checkHealth.mockResolvedValue({
        status: 'degraded',
        checks: { database, redis },
      });

      try {
        await controller.getReadiness();
        throw new Error('Expected readiness to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect((error as ServiceUnavailableException).getStatus()).toBe(
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    },
  );
});
