import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import {
  NotificationType,
  NotificationChannel,
  NotificationDeliveryResult,
  PasswordResetNotificationPayload,
  CustomerWelcomeNotificationPayload,
  OrderPlacedNotificationPayload,
  OrderStatusUpdatedNotificationPayload,
  MerchantOrderReceivedNotificationPayload,
  OrderItemShippedNotificationPayload,
  MerchantWelcomeNotificationPayload,
  MerchantApprovedNotificationPayload,
} from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { DispatchEventDto } from './dto/dispatch-event.dto';

export interface CreateInAppNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  recipient?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Persists an in-app notification in PostgreSQL notification.notifications
   */
  async createInAppNotification(params: CreateInAppNotificationParams) {
    try {
      const created = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          channel: NotificationChannel.IN_APP,
          recipient: params.recipient || params.userId,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          metadata: (params.metadata as Prisma.InputJsonValue) || Prisma.JsonNull,
        },
      });

      this.logger.log(
        `In-app notification created for user ${params.userId} [${params.type}]: ${params.title}`,
      );

      return created;
    } catch (error: any) {
      this.logger.error(
        `Failed to persist in-app notification for user ${params.userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves paginated notifications strictly scoped to the requesting authenticated user.
   */
  async getUserNotifications(userId: string, query: QueryNotificationsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: query.channel || NotificationChannel.IN_APP,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId,
          channel: NotificationChannel.IN_APP,
          readAt: null,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        unreadCount,
      },
    };
  }

  /**
   * Returns unread in-app notification count for the authenticated user.
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
    });

    return { unreadCount };
  }

  /**
   * Marks a single notification as read.
   * Guarantees strict user isolation: callers cannot mark notifications belonging to other users.
   */
  async markAsRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found or access denied');
    }

    if (existing.readAt) {
      return existing;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Marks all unread in-app notifications as read for the authenticated user.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  /**
   * Contract-compliant password reset delivery endpoint.
   * Dispatched by auth-service point-to-point.
   * NEVER stores or logs cleartext reset tokens.
   */
  async handlePasswordReset(
    payload: PasswordResetNotificationPayload,
  ): Promise<NotificationDeliveryResult> {
    this.logger.log(
      `Password reset email requested for recipient: ${payload.recipientEmail}`,
    );

    const emailResult = await this.emailService.sendPasswordReset({
      recipientEmail: payload.recipientEmail,
      recipientName: payload.recipientName,
      resetUrl: payload.resetUrl,
      expiresInMinutes: payload.expiresInMinutes,
    });

    // Record audit entry in PostgreSQL notification table (without raw token)
    try {
      // Find userId for email if available, or generate a deterministic dummy uuid for audit
      const user = await this.prisma.user.findUnique({
        where: { email: payload.recipientEmail.toLowerCase() },
        select: { id: true },
      });

      if (user) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: NotificationType.PASSWORD_RESET,
            title: 'Password Reset Request',
            message: 'A password reset link was sent to your registered email address.',
            channel: NotificationChannel.EMAIL,
            recipient: payload.recipientEmail,
            status:
              emailResult.status === 'delivered'
                ? NotificationStatus.SENT
                : emailResult.status === 'failed'
                  ? NotificationStatus.FAILED
                  : NotificationStatus.PENDING,
            sentAt: emailResult.status === 'delivered' ? new Date() : null,
            error: emailResult.error || null,
            metadata: {
              requestedAt: payload.requestedAt,
              expiresInMinutes: payload.expiresInMinutes,
              deliveryMethod: emailResult.deliveryMethod,
            },
          },
        });
      }
    } catch (auditErr: any) {
      this.logger.warn(
        `Could not write password reset audit record: ${auditErr.message}`,
      );
    }

    return {
      status: emailResult.status,
      deliveryMethod: emailResult.deliveryMethod === 'smtp' ? 'smtp' : 'development-local',
      recipient: payload.recipientEmail,
      messageId: emailResult.messageId,
      error: emailResult.error,
    };
  }

  /**
   * Internal event dispatcher that coordinates multi-channel delivery (Email + In-App)
   * for asynchronous platform domain events.
   */
  async dispatchEvent(dto: DispatchEventDto) {
    const { eventType, payload } = dto;
    this.logger.log(`Dispatching domain event: [${eventType}]`);

    switch (eventType) {
      case NotificationType.CUSTOMER_WELCOME: {
        const welcomePayload = payload as CustomerWelcomeNotificationPayload;
        // 1. Email
        const emailResult = await this.emailService.sendCustomerWelcome({
          name: welcomePayload.recipientName,
          email: welcomePayload.recipientEmail,
        });
        // 2. In-App
        const inApp = await this.createInAppNotification({
          userId: welcomePayload.userId,
          type: NotificationType.CUSTOMER_WELCOME,
          title: 'Welcome to Shopkart!',
          message: `Welcome ${welcomePayload.recipientName}! We are excited to have you on Shopkart. Discover curated products from trusted merchants.`,
          recipient: welcomePayload.recipientEmail,
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      case NotificationType.ORDER_PLACED: {
        const orderPayload = payload as OrderPlacedNotificationPayload;
        // 1. Customer Confirmation Email
        const emailResult = await this.emailService.sendOrderPlaced({
          recipientEmail: orderPayload.recipientEmail,
          recipientName: orderPayload.recipientName,
          orderNumber: orderPayload.orderNumber,
          totalAmount: orderPayload.totalAmount,
          items: orderPayload.items,
          shippingAddress: orderPayload.shippingAddress,
        });
        // 2. Customer In-App Notification
        const inApp = await this.createInAppNotification({
          userId: orderPayload.userId,
          type: NotificationType.ORDER_PLACED,
          title: `Order Confirmed #${orderPayload.orderNumber}`,
          message: `Your order #${orderPayload.orderNumber} for ₹${Number(orderPayload.totalAmount).toFixed(2)} has been confirmed and is being processed.`,
          metadata: {
            orderId: orderPayload.orderId,
            orderNumber: orderPayload.orderNumber,
            totalAmount: orderPayload.totalAmount,
          },
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      case NotificationType.ORDER_STATUS_UPDATED: {
        const statusPayload = payload as OrderStatusUpdatedNotificationPayload;
        // 1. Email
        const emailResult = await this.emailService.sendOrderStatusUpdated({
          recipientEmail: statusPayload.recipientEmail,
          recipientName: statusPayload.recipientName,
          orderNumber: statusPayload.orderNumber,
          previousStatus: statusPayload.previousStatus,
          newStatus: statusPayload.newStatus,
          notes: statusPayload.notes,
        });
        // 2. In-App
        const inApp = await this.createInAppNotification({
          userId: statusPayload.userId,
          type: NotificationType.ORDER_STATUS_UPDATED,
          title: `Order #${statusPayload.orderNumber} Status: ${statusPayload.newStatus}`,
          message: `Your order #${statusPayload.orderNumber} has transitioned to ${statusPayload.newStatus}.${statusPayload.notes ? ` Notes: ${statusPayload.notes}` : ''}`,
          metadata: {
            orderId: statusPayload.orderId,
            orderNumber: statusPayload.orderNumber,
            previousStatus: statusPayload.previousStatus,
            newStatus: statusPayload.newStatus,
          },
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      case NotificationType.MERCHANT_ORDER_RECEIVED: {
        const merchantPayload = payload as MerchantOrderReceivedNotificationPayload;
        // 1. Merchant Alert Email
        const emailResult = await this.emailService.sendMerchantOrderReceived({
          merchantEmail: merchantPayload.merchantEmail,
          merchantName: merchantPayload.merchantName,
          orderNumber: merchantPayload.orderNumber,
          totalAmount: merchantPayload.totalAmount,
          items: merchantPayload.items,
        });
        // 2. Merchant In-App Notification
        const inApp = await this.createInAppNotification({
          userId: merchantPayload.merchantId,
          type: NotificationType.MERCHANT_ORDER_RECEIVED,
          title: `New Order Received #${merchantPayload.orderNumber}`,
          message: `You received order #${merchantPayload.orderNumber} with ${merchantPayload.items.length} item(s) totaling ₹${Number(merchantPayload.totalAmount).toFixed(2)}.`,
          metadata: {
            orderId: merchantPayload.orderId,
            orderNumber: merchantPayload.orderNumber,
            subtotal: merchantPayload.totalAmount,
          },
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      case NotificationType.ORDER_ITEM_SHIPPED: {
        const shippedPayload = payload as OrderItemShippedNotificationPayload;
        // 1. Email
        const emailResult = await this.emailService.sendOrderItemShipped({
          recipientEmail: shippedPayload.recipientEmail,
          recipientName: shippedPayload.recipientName,
          orderNumber: shippedPayload.orderNumber,
          productName: shippedPayload.productName,
          quantity: shippedPayload.quantity,
          carrier: shippedPayload.carrier,
          trackingNumber: shippedPayload.trackingNumber,
        });
        // 2. In-App
        const inApp = await this.createInAppNotification({
          userId: shippedPayload.userId,
          type: NotificationType.ORDER_ITEM_SHIPPED,
          title: `Item Shipped from Order #${shippedPayload.orderNumber}`,
          message: `Your item "${shippedPayload.productName}" (Qty: ${shippedPayload.quantity}) has been dispatched.${shippedPayload.trackingNumber ? ` Tracking #${shippedPayload.trackingNumber}` : ''}`,
          metadata: {
            orderId: shippedPayload.orderId,
            itemId: shippedPayload.itemId,
            trackingNumber: shippedPayload.trackingNumber,
          },
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      case NotificationType.MERCHANT_WELCOME: {
        const welcomePayload = payload as MerchantWelcomeNotificationPayload;
        // 1. Email
        const emailResult = await this.emailService.sendMerchantWelcome({
          recipientEmail: welcomePayload.recipientEmail,
          businessName: welcomePayload.businessName,
          contactName: welcomePayload.contactName,
        });
        // 2. In-App
        const inApp = await this.createInAppNotification({
          userId: welcomePayload.userId,
          type: NotificationType.MERCHANT_WELCOME,
          title: 'Merchant Registration Received',
          message: `Welcome ${welcomePayload.businessName}! Your merchant account application is undergoing verification.`,
          metadata: { merchantId: welcomePayload.merchantId },
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      case NotificationType.MERCHANT_APPROVED: {
        const approvedPayload = payload as MerchantApprovedNotificationPayload;
        // 1. Email
        const emailResult = await this.emailService.sendMerchantApproved({
          recipientEmail: approvedPayload.recipientEmail,
          businessName: approvedPayload.businessName,
          contactName: approvedPayload.contactName,
        });
        // 2. In-App
        const inApp = await this.createInAppNotification({
          userId: approvedPayload.userId,
          type: NotificationType.MERCHANT_APPROVED,
          title: 'Merchant Account Approved!',
          message: `Congratulations! Your merchant partner account for ${approvedPayload.businessName} has been approved. You may now manage catalog products and process orders.`,
          metadata: { merchantId: approvedPayload.merchantId },
        });
        return { success: true, emailResult, inAppId: inApp.id };
      }

      default:
        throw new BadRequestException(`Unsupported notification event type: ${eventType}`);
    }
  }
}
