import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { AdminBreadcrumb } from './admin-nav';

export function AdminBreadcrumbs({ items, className }: { items: AdminBreadcrumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />}
            {item.href ? (
              <Link href={item.href} className="truncate text-ink-muted transition-colors hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
