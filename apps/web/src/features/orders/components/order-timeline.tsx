'use client';

import React from 'react';
import { CheckIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { formatDate } from '../order-utils';
import type { OrderStatusHistory } from '../types';

interface OrderTimelineProps {
  history?: OrderStatusHistory[];
  currentStatus: string;
}

function getStatusTitle(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Order Placed (Pending Confirmation)';
    case 'CONFIRMED':
      return 'Order Confirmed';
    case 'PROCESSING':
      return 'Processing & Packaging';
    case 'SHIPPED':
      return 'Shipped & In Transit';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Order Cancelled';
    default:
      return status;
  }
}

function getStatusDescription(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Your order has been recorded and inventory reserved. Awaiting dispatch processing.';
    case 'CONFIRMED':
      return 'Order has been verified and confirmed by the fulfillment team.';
    case 'PROCESSING':
      return 'Items are being carefully picked and packed at the fulfillment center.';
    case 'SHIPPED':
      return 'Package has been handed over to the courier partner and is on its way.';
    case 'DELIVERED':
      return 'Package has been successfully handed over to the recipient.';
    case 'CANCELLED':
      return 'This order has been cancelled.';
    default:
      return '';
  }
}

export function OrderTimeline({ history, currentStatus }: OrderTimelineProps) {
  const events = history && history.length > 0 ? history : [];

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4 text-xs text-ink-muted">
        No status history recorded yet. Current status: <span className="font-semibold text-ink">{currentStatus}</span>
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
      {events.map((event, index) => {
        const isLatest = index === events.length - 1;

        return (
          <div key={event.id || `${event.status}-${index}`} className="relative group">
            {/* Timeline Dot / Icon */}
            <div
              className={cn(
                'absolute -left-6 sm:-left-8 top-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 transition-colors',
                isLatest
                  ? 'border-accent-600 bg-accent-600 text-white shadow-sm ring-4 ring-accent-100'
                  : 'border-emerald-600 bg-emerald-600 text-white',
              )}
            >
              <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />
            </div>

            {/* Event Content */}
            <div className="rounded-xl border border-line/80 bg-surface p-3.5 sm:p-4 shadow-xs transition-shadow hover:shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className={cn(textStyles.bodySm, 'font-bold text-ink')}>
                  {getStatusTitle(event.status)}
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-ink-muted">
                  {formatDate(event.changedAt)}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-secondary">
                {getStatusDescription(event.status)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
