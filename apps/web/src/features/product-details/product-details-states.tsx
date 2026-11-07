import React from 'react';
import Link from 'next/link';
import { Button, Skeleton } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

export function ProductDetailsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-3">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-lg sm:h-20 sm:w-20" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProductDetailsError({
  message = 'We could not load this product right now. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center"
    >
      <h1 className={cn(textStyles.h3, 'text-ink')}>Something went wrong</h1>
      <p className={cn(textStyles.bodySm, 'mt-2 max-w-sm text-red-600')}>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ProductNotFound() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h1 className={cn(textStyles.h3, 'text-ink')}>Product not found</h1>
      <p className={cn(textStyles.bodySm, 'mt-2 max-w-sm')}>
        This product may have been removed or is no longer available.
      </p>
      <Link href="/products" className="mt-6">
        <Button variant="secondary" size="sm">
          Browse all products
        </Button>
      </Link>
    </div>
  );
}
