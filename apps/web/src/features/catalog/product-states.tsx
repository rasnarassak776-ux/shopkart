import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

export function ProductEmptyState({
  title = 'No products found',
  description = 'There are no products to show right now. Please check back later.',
  action,
}: {
  title?: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className={cn(textStyles.h3, 'text-ink')}>{title}</h2>
      <p className={cn(textStyles.bodySm, 'mt-2 max-w-sm')}>{description}</p>
      {action && (
        <Link href={action.href} className="mt-6">
          <Button variant="secondary" size="sm">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

export function ProductErrorState({
  message = 'We could not load products right now. Please try again later.',
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
      <h2 className={cn(textStyles.h3, 'text-ink')}>Something went wrong</h2>
      <p className={cn(textStyles.bodySm, 'mt-2 max-w-sm text-red-600')}>
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
