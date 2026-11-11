import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  OrderPlacedNotificationPayload,
  OrderStatusUpdatedNotificationPayload,
  MerchantOrderReceivedNotificationPayload,
  OrderItemShippedNotificationPayload,
} from '@shopkart/common';

@Injectable()
export class NotificationClient {
  private readonly logger = new Logger(NotificationClient.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string;
  private readonly timeoutMs: number = 4000;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('NOTIFICATION_API_URL') ||
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') ||
      process.env.NOTIFICATION_API_URL ||
      process.env.NOTIFICATION_SERVICE_URL ||
      'http://localhost:3050';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
    this.internalApiKey =
      this.configService.get<string>('NOTIFICATION_INTERNAL_API_KEY') ||
      process.env.NOTIFICATION_INTERNAL_API_KEY ||
      'shopkart_internal_notification_secret_key_2026';
  }

  async sendEvent(eventType: NotificationType | string, payload: Record<string, any>): Promise<void> {
    try {
      const url = `${this.baseUrl}/api/v1/notifications/events/dispatch`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': this.internalApiKey,
        },
        body: JSON.stringify({ eventType, payload }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(
          `Notification service responded with status ${response.status} for event ${eventType}`,
        );
      }
    } catch (err: any) {
      this.logger.debug(
        `Failed to send notification event [${eventType}] to ${this.baseUrl}: ${err.message}`,
      );
    }
  }

  async dispatchOrderPlaced(payload: OrderPlacedNotificationPayload): Promise<void> {
    return this.sendEvent(NotificationType.ORDER_PLACED, payload);
  }

  async dispatchOrderStatusUpdated(payload: OrderStatusUpdatedNotificationPayload): Promise<void> {
    return this.sendEvent(NotificationType.ORDER_STATUS_UPDATED, payload);
  }

  async dispatchMerchantOrderReceived(payload: MerchantOrderReceivedNotificationPayload): Promise<void> {
    return this.sendEvent(NotificationType.MERCHANT_ORDER_RECEIVED, payload);
  }

  async dispatchOrderItemShipped(payload: OrderItemShippedNotificationPayload): Promise<void> {
    return this.sendEvent(NotificationType.ORDER_ITEM_SHIPPED, payload);
  }
}
