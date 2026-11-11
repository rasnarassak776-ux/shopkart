import { apiClient } from '@/lib/api-client';
import type {
  NotificationItem,
  PaginatedNotificationsResponse,
  QueryNotificationsDto,
} from './types';

const NOTIFICATION_API_URL = (
  process.env.NEXT_PUBLIC_NOTIFICATION_API_URL || 'http://localhost:3050'
).replace(/\/$/, '');

function buildQuery(query: QueryNotificationsDto): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.unreadOnly) params.set('unreadOnly', 'true');
  if (query.channel) params.set('channel', query.channel);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch authenticated user's in-app notifications with pagination and filtering.
 */
export async function getNotifications(
  query: QueryNotificationsDto = {},
  init?: RequestInit,
): Promise<PaginatedNotificationsResponse> {
  return apiClient<PaginatedNotificationsResponse>(
    `${NOTIFICATION_API_URL}/api/v1/notifications${buildQuery(query)}`,
    init,
  );
}

/**
 * Get count of unread in-app notifications.
 */
export async function getUnreadNotificationCount(
  init?: RequestInit,
): Promise<{ unreadCount: number }> {
  return apiClient<{ unreadCount: number }>(
    `${NOTIFICATION_API_URL}/api/v1/notifications/unread-count`,
    init,
  );
}

/**
 * Mark a specific notification as read.
 */
export async function markNotificationAsRead(
  id: string,
  init?: RequestInit,
): Promise<NotificationItem> {
  return apiClient<NotificationItem>(
    `${NOTIFICATION_API_URL}/api/v1/notifications/${encodeURIComponent(id)}/read`,
    {
      ...init,
      method: 'PATCH',
    },
  );
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllNotificationsAsRead(
  init?: RequestInit,
): Promise<{ success: boolean; updatedCount: number }> {
  return apiClient<{ success: boolean; updatedCount: number }>(
    `${NOTIFICATION_API_URL}/api/v1/notifications/read-all`,
    {
      ...init,
      method: 'PATCH',
    },
  );
}
