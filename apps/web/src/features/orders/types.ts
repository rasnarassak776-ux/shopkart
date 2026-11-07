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
  | 'COD_PENDING'
  | 'COD_COLLECTED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: string;
  transactionReference?: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  addressSnapshot: AddressSnapshot;
  totalAmount: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments?: Payment[];
  statusHistory?: OrderStatusHistory[];
}

export interface QueryOrdersDto {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedOrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
