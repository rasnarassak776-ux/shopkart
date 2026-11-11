import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationType, NotificationChannel } from '@shopkart/common';
import { NotificationStatus } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let emailService: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockNotificationId = '22222222-2222-2222-2222-222222222222';

  const mockNotificationRecord = {
    id: mockNotificationId,
    userId: mockUserId,
    type: NotificationType.ORDER_PLACED,
    title: 'Order Confirmed #ORD-1001',
    message: 'Your order has been confirmed.',
    channel: NotificationChannel.IN_APP,
    recipient: mockUserId,
    status: NotificationStatus.SENT,
    readAt: null,
    sentAt: new Date(),
    error: null,
    metadata: { orderId: 'ord-1' },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(mockNotificationRecord),
        findMany: jest.fn().mockResolvedValue([mockNotificationRecord]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: mockUserId }),
      },
    };

    emailService = {
      sendMail: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'test@example.com',
        messageId: 'msg-123',
      }),
      sendCustomerWelcome: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'alice@example.com',
      }),
      sendPasswordReset: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'user@example.com',
        messageId: 'msg-456',
      }),
      sendOrderPlaced: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'buyer@example.com',
      }),
      sendOrderStatusUpdated: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'buyer@example.com',
      }),
      sendMerchantOrderReceived: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'vendor@example.com',
      }),
      sendOrderItemShipped: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'buyer@example.com',
      }),
      sendMerchantWelcome: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'merchant@example.com',
      }),
      sendMerchantApproved: jest.fn().mockResolvedValue({
        success: true,
        status: 'delivered',
        deliveryMethod: 'smtp',
        recipient: 'merchant@example.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInAppNotification', () => {
    it('creates an in-app notification in postgres', async () => {
      const result = await service.createInAppNotification({
        userId: mockUserId,
        type: NotificationType.ORDER_PLACED,
        title: 'Order Confirmed #ORD-1001',
        message: 'Your order has been confirmed.',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          type: NotificationType.ORDER_PLACED,
          title: 'Order Confirmed #ORD-1001',
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
        }),
      });
      expect(result.id).toBe(mockNotificationId);
    });
  });

  describe('getUserNotifications', () => {
    it('returns paginated notifications for the user with unread count', async () => {
      const result = await service.getUserNotifications(mockUserId, {
        page: 1,
        limit: 10,
        unreadOnly: false,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
          skip: 0,
          take: 10,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.unreadCount).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('returns count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValueOnce(5);
      const result = await service.getUnreadCount(mockUserId);
      expect(result.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read when it belongs to user', async () => {
      prisma.notification.findFirst.mockResolvedValueOnce({
        ...mockNotificationRecord,
        readAt: null,
      });
      prisma.notification.update.mockResolvedValueOnce({
        ...mockNotificationRecord,
        readAt: new Date(),
      });

      const result = await service.markAsRead(mockUserId, mockNotificationId);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
        data: { readAt: expect.any(Date) },
      });
      expect(result.readAt).toBeDefined();
    });

    it('throws NotFoundException when notification belongs to another user or does not exist', async () => {
      prisma.notification.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.markAsRead(mockUserId, 'unauthorized-or-missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for the user', async () => {
      const result = await service.markAllAsRead(mockUserId);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          channel: NotificationChannel.IN_APP,
          readAt: null,
        },
        data: { readAt: expect.any(Date) },
      });
      expect(result.updatedCount).toBe(3);
    });
  });

  describe('handlePasswordReset', () => {
    it('dispatches email and records audit log without storing raw token', async () => {
      const result = await service.handlePasswordReset({
        recipientEmail: 'user@example.com',
        resetUrl: 'http://localhost:3000/reset-password?token=secret123',
        expiresInMinutes: 15,
        requestedAt: new Date().toISOString(),
      });

      expect(emailService.sendPasswordReset).toHaveBeenCalledWith({
        recipientEmail: 'user@example.com',
        resetUrl: 'http://localhost:3000/reset-password?token=secret123',
        expiresInMinutes: 15,
        recipientName: undefined,
      });
      expect(result.status).toBe('delivered');
      expect(result.recipient).toBe('user@example.com');
    });
  });

  describe('dispatchEvent', () => {
    it('dispatches customer welcome event', async () => {
      const res = await service.dispatchEvent({
        eventType: NotificationType.CUSTOMER_WELCOME,
        payload: {
          userId: mockUserId,
          recipientEmail: 'alice@example.com',
          recipientName: 'Alice',
        },
      });
      expect(emailService.sendCustomerWelcome).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('dispatches order placed event', async () => {
      const res = await service.dispatchEvent({
        eventType: NotificationType.ORDER_PLACED,
        payload: {
          orderId: 'ord-1',
          orderNumber: 'ORD-1001',
          userId: mockUserId,
          recipientEmail: 'buyer@example.com',
          recipientName: 'Buyer',
          totalAmount: 999.0,
          items: [],
          shippingAddress: {
            fullName: 'Buyer',
            addressLine1: 'St 1',
            city: 'City',
            state: 'State',
            postalCode: '12345',
          },
        },
      });
      expect(emailService.sendOrderPlaced).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('dispatches merchant order received event', async () => {
      const res = await service.dispatchEvent({
        eventType: NotificationType.MERCHANT_ORDER_RECEIVED,
        payload: {
          orderId: 'ord-1',
          orderNumber: 'ORD-1001',
          merchantId: mockUserId,
          merchantEmail: 'vendor@example.com',
          merchantName: 'Vendor',
          items: [],
          totalAmount: 500.0,
        },
      });
      expect(emailService.sendMerchantOrderReceived).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('dispatches order item shipped event', async () => {
      const res = await service.dispatchEvent({
        eventType: NotificationType.ORDER_ITEM_SHIPPED,
        payload: {
          orderId: 'ord-1',
          orderNumber: 'ORD-1001',
          userId: mockUserId,
          recipientEmail: 'buyer@example.com',
          itemId: 'item-1',
          productName: 'Sneakers',
          quantity: 1,
        },
      });
      expect(emailService.sendOrderItemShipped).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });

    it('dispatches merchant approved event', async () => {
      const res = await service.dispatchEvent({
        eventType: NotificationType.MERCHANT_APPROVED,
        payload: {
          userId: mockUserId,
          merchantId: 'm-1',
          recipientEmail: 'merchant@example.com',
          businessName: 'Vendor Store',
          contactName: 'Bob',
        },
      });
      expect(emailService.sendMerchantApproved).toHaveBeenCalled();
      expect(res.success).toBe(true);
    });
  });
});
