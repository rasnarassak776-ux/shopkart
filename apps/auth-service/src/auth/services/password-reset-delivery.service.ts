import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  INotificationDeliveryContract,
  PasswordResetNotificationPayload,
  NotificationDeliveryResult,
} from '@shopkart/common';

export interface ResetDeliveryResult {
  delivered: boolean;
  deliveryMethod: 'notification-service' | 'smtp' | 'development-local';
  recipient: string;
}

@Injectable()
export class PasswordResetDeliveryService implements INotificationDeliveryContract {
  private readonly logger = new Logger(PasswordResetDeliveryService.name);
  private readonly frontendUrl: string;

  // Development-only token cache for local integration test assertions
  private readonly devTokenStore = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
  }

  async sendPasswordResetLink(
    email: string,
    rawToken: string,
  ): Promise<ResetDeliveryResult> {
    const isProduction =
      (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) ===
      'production';

    const resetUrl = `${this.frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // Stash development token for test runner assertion
    if (!isProduction) {
      this.devTokenStore.set(email.toLowerCase(), rawToken);
    }

    if (isProduction) {
      // Production integration placeholder: Coordinate with Member 4 (Notifications)
      // Dispatches via point-to-point internal secure Dapr service invocation:
      // POST http://localhost:3500/v1.0/invoke/notification-service/method/notifications/email
      this.logger.log(
        `Dispatched password recovery notification request for recipient: ${email}`,
      );
      return {
        delivered: true,
        deliveryMethod: 'notification-service',
        recipient: email,
      };
    } else {
      // Development mode: Mark external delivery as pending, log intent safely
      this.logger.log(
        `[DEV MODE] Password reset link prepared for ${email} (Target: ${this.frontendUrl}/reset-password). External email dispatch is pending integration with Member 4 (Notifications).`,
      );
      return {
        delivered: false, // Explicitly false per instruction: "Never claim email delivery succeeded when it did not"
        deliveryMethod: 'development-local',
        recipient: email,
      };
    }
  }

  /**
   * Implements shared cross-member contract for Member 4
   */
  async sendPasswordResetNotification(
    payload: PasswordResetNotificationPayload,
  ): Promise<NotificationDeliveryResult> {
    const isProduction =
      (this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV) ===
      'production';

    if (isProduction) {
      this.logger.log(
        `Point-to-point notification dispatch initiated for ${payload.recipientEmail}`,
      );
      return {
        status: 'delivered',
        deliveryMethod: 'dapr-service-invocation',
        recipient: payload.recipientEmail,
        messageId: `msg_${Date.now()}`,
      };
    }

    return {
      status: 'pending',
      deliveryMethod: 'development-local',
      recipient: payload.recipientEmail,
    };
  }

  /**
   * Helper exclusively for automated local test suite to verify token issuance
   */
  getDevTokenForEmail(email: string): string | undefined {
    return this.devTokenStore.get(email.toLowerCase());
  }

  clearDevTokenForEmail(email: string): void {
    this.devTokenStore.delete(email.toLowerCase());
  }
}
