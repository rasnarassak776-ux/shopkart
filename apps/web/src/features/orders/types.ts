import type { AddressSnapshot } from '@shopkart/common';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'ONLINE' | 'COD';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'REFUND_PENDING'
  | 'COD_PENDING'
  | 'COD_COLLECTED';

export type CancellationReason =
  | 'CHANGED_MIND'
  | 'FOUND_BETTER_PRICE'
  | 'DELIVERY_TOO_SLOW'
  | 'ITEM_UNAVAILABLE'
  | 'ORDER_PLACED_BY_MISTAKE'
  | 'OTHER';

export const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
];

export const CANCELLATION_REASONS: Array<{ value: CancellationReason; label: string }> = [
  { value: 'CHANGED_MIND', label: 'Changed my mind' },
  { value: 'FOUND_BETTER_PRICE', label: 'Found a better price elsewhere' },
  { value: 'DELIVERY_TOO_SLOW', label: 'Delivery is taking too long' },
  { value: 'ITEM_UNAVAILABLE', label: 'Item is no longer available' },
  { value: 'ORDER_PLACED_BY_MISTAKE', label: 'Order placed by mistake' },
  { value: 'OTHER', label: 'Other reason' },
];

export interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  merchantId?: string | null;
  name?: string;
  productNameSnapshot?: string;
  quantity: number;
  unitPrice?: string;
  unitPriceSnapshot?: string;
  totalPrice?: string;
  status?: OrderStatus;
  imageUrl?: string;
  createdAt?: string;
}

export interface Payment {
  id?: string;
  orderId?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: string;
  transactionReference?: string | null;
  idempotencyKey?: string;
  createdAt?: string;
}

export interface OrderStatusHistory {
  id?: string;
  orderId?: string;
  merchantId?: string | null;
  status: OrderStatus;
  notes?: string | null;
  changedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  addressSnapshot: AddressSnapshot;
  totalAmount: string;
  currency?: string;
  itemCount?: number;
  status: OrderStatus;
  cancellationReason?: string | null;
  cancellationComment?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment?: Payment;
  payments?: Payment[];
  statusHistory?: OrderStatusHistory[];
}

export interface QueryOrdersDto {
  status?: OrderStatus;
  page?: number;
  limit?: number;
  search?: string;
  merchantId?: string;
}

export interface OrderPaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedOrdersResponse {
  data: Order[];
  pagination?: OrderPaginationMetadata;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
