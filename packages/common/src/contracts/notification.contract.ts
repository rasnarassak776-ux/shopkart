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

export enum NotificationType {
  CUSTOMER_WELCOME = 'CUSTOMER_WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
  MERCHANT_ORDER_RECEIVED = 'MERCHANT_ORDER_RECEIVED',
  ORDER_ITEM_SHIPPED = 'ORDER_ITEM_SHIPPED',
  MERCHANT_WELCOME = 'MERCHANT_WELCOME',
  MERCHANT_APPROVED = 'MERCHANT_APPROVED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export interface CustomerWelcomeNotificationPayload {
  userId: string;
  recipientEmail: string;
  recipientName: string;
}

export interface OrderPlacedNotificationPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  recipientEmail: string;
  recipientName: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
  }>;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    phone?: string;
  };
}

export interface OrderStatusUpdatedNotificationPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  recipientEmail: string;
  recipientName?: string;
  previousStatus: string;
  newStatus: string;
  notes?: string;
}

export interface MerchantOrderReceivedNotificationPayload {
  orderId: string;
  orderNumber: string;
  merchantId: string;
  merchantEmail: string;
  merchantName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
}

export interface OrderItemShippedNotificationPayload {
  orderId: string;
  orderNumber: string;
  userId: string;
  recipientEmail: string;
  recipientName?: string;
  itemId: string;
  productName: string;
  quantity: number;
  trackingNumber?: string;
  carrier?: string;
}

export interface MerchantWelcomeNotificationPayload {
  userId: string;
  merchantId: string;
  recipientEmail: string;
  businessName: string;
  contactName: string;
}

export interface MerchantApprovedNotificationPayload {
  userId: string;
  merchantId: string;
  recipientEmail: string;
  businessName: string;
  contactName: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  message: string;
  channel: string;
  recipient: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  readAt: string | null;
  sentAt: string | null;
  error: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}
