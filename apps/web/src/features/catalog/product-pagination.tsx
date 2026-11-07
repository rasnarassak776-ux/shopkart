'use client';

import React from 'react';
import { ChevronRightIcon } from '@/components/ui';
import { cn } from '@/lib/cn';

interface ProductPaginationProps {
  page: number;
  totalPages: number;
  onNavigate: (page: number) => void;
  className?: string;
}

const buttonBase =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors';
const buttonIdle =
  'border-line-strong bg-surface text-ink hover:border-ink-muted';
const buttonActive = 'border-ink bg-ink text-white';
const buttonDisabled = 'cursor-not-allowed border-line bg-surface-muted text-ink-muted';

function pageWindow(page: number, totalPages: number): (number | '…')[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

export function ProductPagination({ page, totalPages, onNavigate, className }: ProductPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Product pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onNavigate(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(buttonBase, page <= 1 ? buttonDisabled : buttonIdle)}
      >
        Previous
      </button>

      {pageWindow(page, totalPages).map((item, i) =>
        item === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-ink-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onNavigate(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            className={cn(buttonBase, item === page ? buttonActive : buttonIdle)}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onNavigate(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(buttonBase, 'gap-1', page >= totalPages ? buttonDisabled : buttonIdle)}
      >
        Next
        <ChevronRightIcon className="h-4 w-4" />
      </button>

      <span className="ml-3 hidden text-sm text-ink-muted sm:inline">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
}
