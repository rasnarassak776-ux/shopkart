import { apiClient } from '@/lib/api-client';
import type {
  CancellationReason,
  Order,
  OrderStatus,
  PaginatedOrdersResponse,
  QueryOrdersDto,
} from './types';

const ORDER_API_URL = (
  process.env.NEXT_PUBLIC_ORDER_API_URL || 'http://localhost:3040'
).replace(/\/$/, '');

function buildQuery(query: QueryOrdersDto): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.merchantId) params.set('merchantId', query.merchantId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch customer's own order history.
 */
export async function getCustomerOrders(
  query: QueryOrdersDto = {},
  init?: RequestInit,
): Promise<PaginatedOrdersResponse> {
  return apiClient<PaginatedOrdersResponse>(
    `${ORDER_API_URL}/api/v1/orders${buildQuery(query)}`,
    init,
  );
}

/**
 * Fetch a specific order by ID (customer or merchant).
 */
export async function getOrderById(
  id: string,
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/${encodeURIComponent(id)}`,
    init,
  );
}

/**
 * Customer: cancel an eligible order with a reason and optional comment.
 */
export async function cancelOrder(
  orderId: string,
  payload: { reason: CancellationReason; comment?: string },
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

/**
 * Merchant: list merchant-scoped orders containing the merchant's products.
 */
export async function getMerchantOrders(
  query: QueryOrdersDto = {},
  init?: RequestInit,
): Promise<PaginatedOrdersResponse> {
  return apiClient<PaginatedOrdersResponse>(
    `${ORDER_API_URL}/api/v1/orders/merchant${buildQuery(query)}`,
    init,
  );
}

/**
 * Merchant: fetch merchant-scoped order details by ID.
 */
export async function getMerchantOrderById(
  id: string,
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/merchant/${encodeURIComponent(id)}`,
    init,
  );
}

/**
 * Merchant: update fulfillment status for merchant's own items.
 */
export async function updateMerchantOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes?: string,
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/merchant/${encodeURIComponent(orderId)}/status`,
    {
      ...init,
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    },
  );
}

/**
 * Console/Admin alias: list all orders across users.
 */
export async function getAdminOrders(
  query: QueryOrdersDto = {},
  init?: RequestInit,
): Promise<PaginatedOrdersResponse> {
  return apiClient<PaginatedOrdersResponse>(
    `${ORDER_API_URL}/api/v1/orders/merchant${buildQuery(query)}`,
    init,
  );
}

/**
 * Console/Admin alias: fetch a single order snapshot.
 */
export async function getAdminOrderById(
  id: string,
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/merchant/${encodeURIComponent(id)}`,
    init,
  );
}

/**
 * Console/Admin alias: update order status.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes?: string,
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/merchant/${encodeURIComponent(orderId)}/status`,
    {
      ...init,
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    },
  );
}
