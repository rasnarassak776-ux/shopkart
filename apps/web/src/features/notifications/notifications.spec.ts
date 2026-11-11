import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notifications-api';
import * as apiClientModule from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: jest.fn(),
}));

describe('Notifications API Client', () => {
  const mockApiClient = apiClientModule.apiClient as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getNotifications calls endpoint with pagination query parameters', async () => {
    mockApiClient.mockResolvedValueOnce({
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        unreadCount: 0,
      },
    });

    const res = await getNotifications({ page: 1, limit: 10, unreadOnly: true });

    expect(mockApiClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications?page=1&limit=10&unreadOnly=true'),
      undefined,
    );
    expect(res.data).toEqual([]);
  });

  it('getUnreadNotificationCount calls unread-count endpoint', async () => {
    mockApiClient.mockResolvedValueOnce({ unreadCount: 4 });

    const res = await getUnreadNotificationCount();

    expect(mockApiClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/unread-count'),
      undefined,
    );
    expect(res.unreadCount).toBe(4);
  });

  it('markNotificationAsRead calls PATCH on notification item endpoint', async () => {
    mockApiClient.mockResolvedValueOnce({
      id: 'notif-1',
      readAt: new Date().toISOString(),
    });

    const res = await markNotificationAsRead('notif-1');

    expect(mockApiClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/notif-1/read'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(res.id).toBe('notif-1');
  });

  it('markAllNotificationsAsRead calls PATCH on read-all endpoint', async () => {
    mockApiClient.mockResolvedValueOnce({ success: true, updatedCount: 3 });

    const res = await markAllNotificationsAsRead();

    expect(mockApiClient).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/read-all'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(res.updatedCount).toBe(3);
  });
});
