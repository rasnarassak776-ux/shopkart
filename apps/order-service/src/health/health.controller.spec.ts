import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Order HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockPrismaService = {
    isHealthy: jest.fn().mockResolvedValue(true),
    order: {
      count: jest.fn().mockResolvedValue(0),
    },
    orderItem: {
      count: jest.fn().mockResolvedValue(0),
    },
    payment: {
      count: jest.fn().mockResolvedValue(0),
    },
    orderStatusHistory: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status ok', async () => {
    const result = await controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('order-service');
    expect(result.checks.database).toBe('connected');
  });

  it('should return database verification in non-production mode', async () => {
    delete process.env.NODE_ENV;
    const result = await controller.verifyDatabase();
    expect(result.success).toBe(true);
    expect(result.tables).toBeDefined();
    expect(result.tables!.orders.totalCount).toBe(0);
    expect(result.tables!.orderItems.totalCount).toBe(0);
    expect(result.tables!.payments.totalCount).toBe(0);
    expect(result.tables!.orderStatusHistory.totalCount).toBe(0);
  });

  it('should hide table details in production mode', async () => {
    process.env.NODE_ENV = 'production';
    const result = await controller.verifyDatabase();
    expect(result.success).toBe(true);
    expect(result.tables).toBeUndefined();
    expect(result.message).toContain('restricted');
    delete process.env.NODE_ENV;
  });
});
