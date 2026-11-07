export interface OrderItemResponse {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
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
  totalAmount: string;
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
  statusHistory?: Array<{ status: string; changedAt: string }>;
  createdAt: string;
  updatedAt: string;
}
