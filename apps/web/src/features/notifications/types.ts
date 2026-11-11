export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  message: string;
  channel: string;
  recipient: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  readAt: string | null;
  sentAt: string | null;
  error?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface PaginatedNotificationsResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    unreadCount: number;
  };
}

export interface QueryNotificationsDto {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  channel?: string;
}
