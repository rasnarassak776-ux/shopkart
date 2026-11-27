import { apiClient } from '@/lib/api-client';
import type {
  AddressFormData,
  CheckoutAddress,
  CheckoutValidationRequest,
  CheckoutValidationResult,
  CreateOrderRequest,
  CreateOrderResponse,
  RazorpayOrderSession,
  VerifyRazorpayPaymentRequest,
  VerifyRazorpayPaymentResponse,
} from './types';

const ORDER_API_URL = (
  typeof window === 'undefined'
    ? (process.env.INTERNAL_ORDER_URL || process.env.ORDER_API_URL || 'http://shopkart-order:3040')
    : (process.env.NEXT_PUBLIC_ORDER_API_URL !== undefined
        ? process.env.NEXT_PUBLIC_ORDER_API_URL
        : 'http://localhost:3040')
).replace(/\/$/, '');

/**
 * Fetch all saved delivery addresses for the authenticated customer.
 * Handled by Auth Service (port 3001).
 */
export async function listAddresses(init?: RequestInit): Promise<CheckoutAddress[]> {
  const data = await apiClient<CheckoutAddress[]>('/api/v1/users/me/addresses', init);
  return Array.isArray(data) ? data : [];
}

/**
 * Create a new delivery address for the authenticated customer.
 */
export async function createAddress(
  payload: AddressFormData,
  init?: RequestInit,
): Promise<CheckoutAddress> {
  return apiClient<CheckoutAddress>('/api/v1/users/me/addresses', {
    ...init,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing delivery address.
 */
export async function updateAddress(
  addressId: string,
  payload: Partial<AddressFormData>,
  init?: RequestInit,
): Promise<CheckoutAddress> {
  return apiClient<CheckoutAddress>(`/api/v1/users/me/addresses/${encodeURIComponent(addressId)}`, {
    ...init,
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Set an address as the default delivery address.
 */
export async function setDefaultAddress(
  addressId: string,
  init?: RequestInit,
): Promise<CheckoutAddress> {
  return apiClient<CheckoutAddress>(
    `/api/v1/users/me/addresses/${encodeURIComponent(addressId)}/default`,
    {
      ...init,
      method: 'PATCH',
      body: JSON.stringify({}),
    },
  );
}

/**
 * Validate cart items and shipping address prior to order placement.
 * Connected to Order Service (port 3040).
 */
export async function validateCheckout(
  req: CheckoutValidationRequest,
  init?: RequestInit,
): Promise<CheckoutValidationResult> {
  return apiClient<CheckoutValidationResult>(
    `${ORDER_API_URL}/api/v1/checkout/validate`,
    {
      ...init,
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
}

/**
 * Order placement endpoint (Phase 5).
 */
export async function placeOrder(
  req: CreateOrderRequest,
  init?: RequestInit,
): Promise<CreateOrderResponse> {
  const customHeaders: Record<string, string> = {
    'Idempotency-Key': req.idempotencyKey,
  };

  const payload = {
    addressId: req.addressId,
    paymentMethod: req.paymentMethod,
  };

  const data = await apiClient<any>(`${ORDER_API_URL}/api/v1/orders`, {
    ...init,
    headers: {
      ...customHeaders,
      ...(init?.headers as Record<string, string>),
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    orderId: data.id || data.orderId,
    status: data.status,
    totalAmount: data.totalAmount,
    paymentMethod: data.payment?.paymentMethod || req.paymentMethod,
    paymentStatus: data.payment?.paymentStatus || 'COD_PENDING',
    createdAt: data.createdAt,
  };
}

/**
 * Create a Razorpay order for online payment.
 * Pass `addressId` for a new order, or `orderId` to retry payment on an
 * existing unpaid order. Requires an Idempotency-Key header for new orders.
 */
export async function createRazorpayOrder(
  req: { addressId?: string; orderId?: string; idempotencyKey?: string },
  init?: RequestInit,
): Promise<RazorpayOrderSession> {
  const headers: Record<string, string> = {};
  if (req.idempotencyKey) {
    headers['Idempotency-Key'] = req.idempotencyKey;
  }

  return apiClient<RazorpayOrderSession>(
    `${ORDER_API_URL}/api/v1/payments/razorpay/create-order`,
    {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string>),
      },
      method: 'POST',
      body: JSON.stringify({ addressId: req.addressId, orderId: req.orderId }),
    },
  );
}

/**
 * Verify a completed Razorpay Checkout payment on the backend.
 */
export async function verifyRazorpayPayment(
  req: VerifyRazorpayPaymentRequest,
  init?: RequestInit,
): Promise<VerifyRazorpayPaymentResponse> {
  return apiClient<VerifyRazorpayPaymentResponse>(
    `${ORDER_API_URL}/api/v1/payments/razorpay/verify`,
    {
      ...init,
      method: 'POST',
      body: JSON.stringify(req),
    },
  );
}
