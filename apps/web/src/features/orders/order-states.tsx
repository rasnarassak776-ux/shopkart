import React from 'react';
import Link from 'next/link';
import { Button, Skeleton } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

export function OrdersEmptyState({
  title = 'No orders found',
  description = 'You have not placed any orders yet. Discover our catalog and find something you love.',
  action = { label: 'Start shopping', href: '/products' },
}: {
  title?: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-accent-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      </div>
      <h2 className={cn(textStyles.h2, 'text-ink')}>{title}</h2>
      <p className={cn(textStyles.bodySm, 'mt-2 max-w-md text-ink-muted')}>
        {description}
      </p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button variant="primary" size="md">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

export function OrderLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-line p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-60" />
          <div className="pt-4 border-t border-line flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderErrorState({
  message = 'We could not load orders right now. Please try again later.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-danger/30 bg-danger/5 px-6 py-12 text-center"
    >
      <p className={cn(textStyles.bodySm, 'font-medium text-danger')}>
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
