import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@shopkart/common';

@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') ||
      process.env.NOTIFICATION_SERVICE_URL ||
      'http://localhost:3050';
    this.notificationServiceUrl = rawUrl.replace(/\/+$/, '');
    this.internalApiKey =
      this.configService.get<string>('NOTIFICATION_INTERNAL_API_KEY') ||
      process.env.NOTIFICATION_INTERNAL_API_KEY ||
      'shopkart_internal_notification_secret_key_2026';
  }

  /**
   * Dispatches a domain event asynchronously to the Notification Service.
   * Safe fire-and-forget so failure never aborts business workflows.
   */
  async dispatchEvent(eventType: NotificationType | string, payload: Record<string, any>): Promise<void> {
    try {
      const response = await fetch(
        `${this.notificationServiceUrl}/api/v1/notifications/events/dispatch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Key': this.internalApiKey,
          },
          body: JSON.stringify({ eventType, payload }),
          signal: AbortSignal.timeout(3000),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Notification dispatch responded with status ${response.status} for event ${eventType}`,
        );
      }
    } catch (err: any) {
      this.logger.debug(
        `Asynchronous notification event [${eventType}] dispatch could not reach notification-service: ${err.message}`,
      );
    }
  }
}
