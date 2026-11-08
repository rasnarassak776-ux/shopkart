import type { AddressSnapshot } from '@shopkart/common';

export type PaymentMethod = 'COD' | 'ONLINE';

export interface CheckoutAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressFormData {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  badge?: string;
  badgeVariant?: 'accent' | 'warning' | 'dark' | 'neutral';
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface CheckoutValidationState {
  isValid: boolean;
  errors: string[];
  canProceed: boolean;
}

export interface CheckoutValidationRequest {
  addressId: string;
}

export interface CheckoutValidationResult {
  valid: boolean;
  address: AddressSnapshot;
  itemsAvailable: boolean;
  unavailableItems?: Array<{
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
  subtotal: string;
  shippingFee: string;
  totalAmount: string;
}

export interface CreateOrderRequest {
  addressId: string;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: string;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  createdAt: string;
}
