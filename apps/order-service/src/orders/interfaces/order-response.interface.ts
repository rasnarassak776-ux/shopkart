export interface OrderItemResponse {
  id: string;
  productId: string;
  merchantId?: string | null;
  name: string;
  productNameSnapshot?: string;
  quantity: number;
  unitPrice: string;
  unitPriceSnapshot?: string;
  totalPrice: string;
  status?: string;
}

export interface OrderPaymentResponse {
  paymentMethod: string;
  paymentStatus: string;
  amount: string;
  idempotencyKey?: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  status: string;
  cancellationReason?: string | null;
  cancellationComment?: string | null;
  cancelledAt?: string | null;
  totalAmount: string;
  currency?: string;
  itemCount?: number;
  addressSnapshot: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItemResponse[];
  payment?: OrderPaymentResponse;
  statusHistory?: Array<{
    id?: string;
    merchantId?: string | null;
    notes?: string | null;
    status: string;
    changedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
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
  data: OrderResponse[];
  pagination: OrderPaginationMetadata;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
