'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
} from './notifications-api';
import type { NotificationItem } from './types';

interface NotificationContextValue {
  unreadCount: number;
  recentNotifications: NotificationItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadAndRecent = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      setRecentNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await getNotifications({ page: 1, limit: 5 });
      setRecentNotifications(res.data || []);
      setUnreadCount(res.pagination?.unreadCount ?? 0);
    } catch (err: any) {
      // In dev mode when notification-service might be starting, keep silent or store error
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchUnreadAndRecent();

    if (!isAuthenticated) return;

    // Periodic polling every 30 seconds
    const interval = setInterval(fetchUnreadAndRecent, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadAndRecent, isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiMarkAsRead(id);
      setRecentNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiMarkAllAsRead();
      const now = new Date().toISOString();
      setRecentNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || now })),
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        isLoading,
        error,
        refresh: fetchUnreadAndRecent,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
