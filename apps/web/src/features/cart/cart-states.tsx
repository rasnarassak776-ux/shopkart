import React from 'react';
import Link from 'next/link';
import { Button, CartIcon, Skeleton } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

export function CartEmptyState({
  title = 'Your shopping cart is empty',
  description = 'You have not added any items to your cart yet. Explore our catalog to find great products.',
  action = { label: 'Explore products', href: '/products' },
}: {
  title?: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-accent-700">
        <CartIcon className="h-8 w-8" />
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

export function CartLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-line p-4"
            >
              <Skeleton className="h-20 w-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
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

export function CartErrorState({
  message = 'We could not load your shopping cart. Please try again.',
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
