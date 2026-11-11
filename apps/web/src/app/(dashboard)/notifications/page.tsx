import React from 'react';
import type { Metadata } from 'next';
import { Container } from '@/components/ui';
import { NotificationList } from '@/features/notifications';

export const metadata: Metadata = {
  title: 'Notifications - Shopkart',
  description: 'View your order updates, shipments, and account alerts.',
};

export default function NotificationsPage() {
  return (
    <div className="py-8 sm:py-10">
      <Container className="max-w-4xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Notification Center
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Stay updated with your latest orders, shipments, and account alerts.
          </p>
        </div>

        <NotificationList />
      </Container>
    </div>
  );
}
