import { apiClient } from '@/lib/api-client';
import type {
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
    `${ORDER_API_URL}/api/v1/orders/my-orders${buildQuery(query)}`,
    init,
  );
}

/**
 * Fetch a specific order by ID (customer or admin).
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
 * Admin: list all orders across users.
 */
export async function getAdminOrders(
  query: QueryOrdersDto = {},
  init?: RequestInit,
): Promise<PaginatedOrdersResponse> {
  return apiClient<PaginatedOrdersResponse>(
    `${ORDER_API_URL}/api/v1/orders/admin${buildQuery(query)}`,
    init,
  );
}

/**
 * Admin: update order status.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  init?: RequestInit,
): Promise<Order> {
  return apiClient<Order>(
    `${ORDER_API_URL}/api/v1/orders/admin/${encodeURIComponent(orderId)}/status`,
    {
      ...init,
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}
