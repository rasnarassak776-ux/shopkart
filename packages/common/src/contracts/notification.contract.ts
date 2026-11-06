/**
 * SHOPKART NOTIFICATION INTEGRATION CONTRACT (MEMBER 1 <-> MEMBER 4)
 *
 * This contract establishes the shared interface for password-reset and auth-related
 * notifications dispatched by the Authentication Service (Member 1) to the
 * Notification Service (Member 4).
 *
 * SECURITY INSTRUCTIONS:
 * 1. NEVER publish raw reset tokens to general-purpose Pub/Sub topics.
 * 2. Communication MUST be point-to-point via secure gRPC, internal HTTP REST,
 *    or dedicated Dapr service invocation:
 *    `http://localhost:3500/v1.0/invoke/notification-service/method/notifications/email`
 * 3. In local development or until Member 4 deploy completes, external dispatch
 *    MUST be marked as 'pending' rather than claiming false delivery.
 */

export interface PasswordResetNotificationPayload {
  recipientEmail: string;
  recipientName?: string;
  resetUrl: string;
  expiresInMinutes: number;
  requestedAt: string; // ISO 8601
}

export type NotificationDeliveryStatus = 'delivered' | 'pending' | 'failed';

export interface NotificationDeliveryResult {
  status: NotificationDeliveryStatus;
  deliveryMethod: 'dapr-service-invocation' | 'internal-grpc' | 'smtp' | 'development-local';
  recipient: string;
  messageId?: string;
  error?: string;
}

export interface INotificationDeliveryContract {
  sendPasswordResetNotification(
    payload: PasswordResetNotificationPayload,
  ): Promise<NotificationDeliveryResult>;
}
