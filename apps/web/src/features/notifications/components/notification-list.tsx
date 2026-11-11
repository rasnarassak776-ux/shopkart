'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BellIcon, buttonClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import {
  getNotifications,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
} from '../notifications-api';
import type { NotificationItem } from '../types';

export function NotificationList() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (targetPage: number, unreadFilter: boolean) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getNotifications({
        page: targetPage,
        limit: 15,
        unreadOnly: unreadFilter,
      });
      setNotifications(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
      setUnreadCount(res.pagination?.unreadCount || 0);
      setPage(targetPage);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPage(page, unreadOnly);
    }
  }, [fetchPage, isAuthenticated, page, unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiMarkAllAsRead();
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || now })),
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <BellIcon className="mx-auto h-12 w-12 text-ink-muted opacity-40 mb-3" />
        <h2 className="font-display text-lg font-bold text-ink mb-1">Sign in to view notifications</h2>
        <p className="text-sm text-ink-muted mb-6">Track your orders, status updates, and account alerts.</p>
        <Link href="/login" className={buttonClasses({ variant: 'primary' })}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        {/* Filter Pills */}
        <div className="inline-flex rounded-lg border border-line bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(false);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 font-medium transition-colors',
              !unreadOnly
                ? 'bg-primary text-white shadow-sm'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            All notifications
          </button>
          <button
            type="button"
            onClick={() => {
              setUnreadOnly(true);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5',
              unreadOnly
                ? 'bg-primary text-white shadow-sm'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  unreadOnly ? 'bg-white text-primary' : 'bg-accent-100 text-accent-700',
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Button */}
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-accent-600 hover:text-accent-700 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-line bg-surface-muted/40 p-4"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          <p className="mb-3">{error}</p>
          <button
            type="button"
            onClick={() => fetchPage(page, unreadOnly)}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface py-16 text-center text-ink-muted">
          <BellIcon className="mx-auto h-12 w-12 opacity-30 mb-3" />
          <h3 className="font-display text-base font-bold text-ink">
            {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">
            {unreadOnly
              ? 'You have read all your notifications. Switch to "All" to view past messages.'
              : 'Important updates regarding your orders, shipments, and account will appear here.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden shadow-sm">
          {notifications.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start justify-between gap-4 p-4 transition-colors hover:bg-surface-muted/40',
                  isUnread && 'bg-accent-50/40',
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-1 flex-shrink-0">
                    {isUnread ? (
                      <span className="block h-2.5 w-2.5 rounded-full bg-accent-600" />
                    ) : (
                      <span className="block h-2.5 w-2.5 rounded-full bg-line" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h4
                        className={cn(
                          'text-sm text-ink',
                          isUnread ? 'font-bold' : 'font-medium',
                        )}
                      >
                        {item.title || 'Notification'}
                      </h4>
                      <span className="text-xs text-ink-muted">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                {isUnread && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(item.id)}
                    className="flex-shrink-0 text-xs font-medium text-accent-600 hover:text-accent-700 hover:underline px-2 py-1 rounded"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="text-xs text-ink-muted">
            Showing page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={buttonClasses({
                variant: 'secondary',
                size: 'sm',
                className: page <= 1 ? 'opacity-50 cursor-not-allowed' : '',
              })}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={buttonClasses({
                variant: 'secondary',
                size: 'sm',
                className: page >= totalPages ? 'opacity-50 cursor-not-allowed' : '',
              })}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
