import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ConfigService } from '@nestjs/config';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: any;

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'customer',
  };

  beforeEach(async () => {
    service = {
      getUserNotifications: jest.fn().mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1, unreadCount: 0 },
      }),
      getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
      markAsRead: jest.fn().mockResolvedValue({ id: 'notif-1', readAt: new Date() }),
      markAllAsRead: jest.fn().mockResolvedValue({ success: true, updatedCount: 5 }),
      handlePasswordReset: jest.fn().mockResolvedValue({
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'user@example.com',
      }),
      dispatchEvent: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: service },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getUserNotifications calls service with current user id', async () => {
    await controller.getUserNotifications(mockUser, { page: 1, limit: 20 });
    expect(service.getUserNotifications).toHaveBeenCalledWith(mockUser.id, { page: 1, limit: 20 });
  });

  it('getUnreadCount calls service with current user id', async () => {
    await controller.getUnreadCount(mockUser);
    expect(service.getUnreadCount).toHaveBeenCalledWith(mockUser.id);
  });

  it('markAsRead calls service with user id and notification id', async () => {
    await controller.markAsRead(mockUser, 'notif-1');
    expect(service.markAsRead).toHaveBeenCalledWith(mockUser.id, 'notif-1');
  });

  it('markAllAsRead calls service with user id', async () => {
    await controller.markAllAsRead(mockUser);
    expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
  });

  it('sendPasswordReset calls service with payload', async () => {
    const payload = {
      recipientEmail: 'user@example.com',
      resetUrl: 'http://localhost:3000/reset',
      expiresInMinutes: 15,
      requestedAt: new Date().toISOString(),
    };
    await controller.sendPasswordReset(payload);
    expect(service.handlePasswordReset).toHaveBeenCalledWith(payload);
  });

  it('dispatchEvent calls service with domain event', async () => {
    const event = {
      eventType: 'CUSTOMER_WELCOME',
      payload: { userId: 'u-1', recipientEmail: 'u@test.com', recipientName: 'U' },
    };
    await controller.dispatchEvent(event);
    expect(service.dispatchEvent).toHaveBeenCalledWith(event);
  });
});
