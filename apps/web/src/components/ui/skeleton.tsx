import React from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-gray-200/70', className)} {...props} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface" aria-hidden="true">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-square rounded-xl" />
      <Skeleton className="mx-auto mt-3 h-4 w-20" />
    </div>
  );
}
