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
