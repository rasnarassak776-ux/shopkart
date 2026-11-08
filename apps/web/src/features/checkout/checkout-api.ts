import { apiClient } from '@/lib/api-client';
import type {
  AddressFormData,
  CheckoutAddress,
  CheckoutValidationRequest,
  CheckoutValidationResult,
  CreateOrderRequest,
  CreateOrderResponse,
} from './types';

const ORDER_API_URL = (
  process.env.NEXT_PUBLIC_ORDER_API_URL || 'http://localhost:3040'
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
