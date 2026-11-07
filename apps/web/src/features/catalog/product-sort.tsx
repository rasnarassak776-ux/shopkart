'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/cn';
import type { CatalogSortBy, CatalogSortOrder } from './types';

export interface SortSelection {
  sortBy?: CatalogSortBy;
  sortOrder?: CatalogSortOrder;
}

export const SORT_OPTIONS: { value: string; label: string; sort: SortSelection }[] = [
  { value: 'newest', label: 'Newest first', sort: { sortBy: 'createdAt', sortOrder: 'desc' } },
  { value: 'oldest', label: 'Oldest first', sort: { sortBy: 'createdAt', sortOrder: 'asc' } },
  { value: 'price_asc', label: 'Price: Low to High', sort: { sortBy: 'price', sortOrder: 'asc' } },
  { value: 'price_desc', label: 'Price: High to Low', sort: { sortBy: 'price', sortOrder: 'desc' } },
  { value: 'name_asc', label: 'Name: A to Z', sort: { sortBy: 'name', sortOrder: 'asc' } },
  { value: 'name_desc', label: 'Name: Z to A', sort: { sortBy: 'name', sortOrder: 'desc' } },
];

export function sortKeyFromParams(sortBy?: string, sortOrder?: string): string {
  const match = SORT_OPTIONS.find(
    (o) => o.sort.sortBy === sortBy && o.sort.sortOrder === sortOrder,
  );
  if (match) return match.value;
  // Tolerate partial params: fall back to the closest sensible option.
  if (sortBy === 'price') return sortOrder === 'asc' ? 'price_asc' : 'price_desc';
  if (sortBy === 'name') return sortOrder === 'asc' ? 'name_asc' : 'name_desc';
  if (sortBy === 'createdAt') return sortOrder === 'asc' ? 'oldest' : 'newest';
  return 'newest';
}

interface ProductSortProps {
  sortBy?: string;
  sortOrder?: string;
  onChange: (sort: SortSelection) => void;
  className?: string;
}

export function ProductSort({ sortBy, sortOrder, onChange, className }: ProductSortProps) {
  const selectId = useId();
  const current = sortKeyFromParams(sortBy, sortOrder);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={selectId} className="text-sm text-ink-secondary">
        Sort by
      </label>
      <select
        id={selectId}
        value={current}
        onChange={(e) => {
          const option = SORT_OPTIONS.find((o) => o.value === e.target.value);
          if (option) onChange(option.sort);
        }}
        className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
