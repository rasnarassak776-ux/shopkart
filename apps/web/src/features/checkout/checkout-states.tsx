import React from 'react';
import Link from 'next/link';
import { Button, Skeleton } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

export function CheckoutLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-line p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="rounded-xl border border-line p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
        <div className="rounded-xl border border-line p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-6" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutErrorState({
  message = 'There was a problem initiating checkout. Please try again.',
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

export function CheckoutFoundationPlaceholder() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700">
        <span className="font-display text-xl font-bold">₹</span>
      </div>
      <h2 className={cn(textStyles.h2, 'text-ink')}>Checkout System Ready</h2>
      <p className={cn(textStyles.bodySm, 'mt-2 max-w-md text-ink-muted')}>
        The Checkout orchestration foundation is connected to the Order Service. Full multi-step address selection and payment processing will be finalized in Phase 3.
      </p>
      <div className="mt-6 flex gap-4">
        <Link href="/cart">
          <Button variant="secondary" size="sm">
            View Cart
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="primary" size="sm">
            Browse Products
          </Button>
        </Link>
      </div>
    </div>
  );
}
