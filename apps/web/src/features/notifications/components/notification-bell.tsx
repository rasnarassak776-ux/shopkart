'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon, buttonClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '../notification-context';
import type { NotificationItem } from '../types';

function formatRelativeTime(isoString: string): string {
  try {
    const diffSeconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

export function NotificationBell({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const {
    unreadCount,
    recentNotifications,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          buttonClasses({ variant: 'ghost', size: 'icon' }),
          'relative text-ink hover:text-primary transition-colors',
        )}
      >
        <BellIcon className="h-[22px] w-[22px]" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white shadow-sm animate-pulse"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notifications panel"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-line bg-surface p-0 shadow-overlay z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface-muted/50">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-accent-600 hover:text-accent-700 hover:underline transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-line">
            {isLoading && recentNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                <p>Loading notifications...</p>
              </div>
            ) : error && recentNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-muted">
                <p className="text-red-500 mb-2">{error}</p>
                <button
                  type="button"
                  onClick={refresh}
                  className="font-medium text-primary underline"
                >
                  Retry
                </button>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">
                <BellIcon className="mx-auto h-8 w-8 opacity-30 mb-2" />
                <p className="text-sm font-medium text-ink">All caught up!</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  You have no notifications right now.
                </p>
              </div>
            ) : (
              recentNotifications.map((notification) => {
                const isUnread = !notification.readAt;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 p-3.5 transition-colors hover:bg-surface-muted/60',
                      isUnread && 'bg-accent-50/40',
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isUnread ? (
                        <span className="block h-2 w-2 rounded-full bg-accent-600 mt-1" />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-transparent mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            'text-xs truncate text-ink',
                            isUnread ? 'font-bold' : 'font-medium',
                          )}
                        >
                          {notification.title || 'Notification'}
                        </p>
                        <span className="text-[10px] text-ink-muted whitespace-nowrap">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                    {isUnread && (
                      <button
                        type="button"
                        title="Mark as read"
                        onClick={() => markAsRead(notification.id)}
                        className="text-[11px] text-ink-muted hover:text-ink px-1 py-0.5 rounded transition-colors"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line p-2 text-center bg-surface-muted/30">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-block py-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              View all notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
