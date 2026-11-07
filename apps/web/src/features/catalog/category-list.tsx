import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { CatalogCategory } from './types';

interface CategoryListProps {
  categories: CatalogCategory[];
  /** Slug or id of the currently selected category; null/undefined = all products. */
  activeCategory?: string | null;
  /**
   * Extra query params (search, filters, sort…) preserved when a category
   * chip is clicked. `category` and `page` are always managed by the chips.
   */
  preserveParams?: Record<string, string | undefined>;
}

function categoryKey(category: CatalogCategory): string {
  return category.slug ?? category.id;
}

function buildHref(key: string | null, preserveParams?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(preserveParams ?? {})) {
    if (k !== 'category' && k !== 'page' && v) params.set(k, v);
  }
  if (key) params.set('category', key);
  const qs = params.toString();
  return qs ? `/products?${qs}` : '/products';
}

/**
 * Horizontal category filter for the storefront. Each chip links to
 * /products?category=<slug|id> so the selection is shareable and
 * survives refreshes.
 */
export function CategoryList({ categories, activeCategory, preserveParams }: CategoryListProps) {
  return (
    <nav aria-label="Product categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={buildHref(null, preserveParams)}
            aria-current={activeCategory ? undefined : 'page'}
            className={cn(
              'inline-flex items-center rounded-full border px-4 py-2 font-display text-sm font-medium transition-colors',
              !activeCategory
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-ink hover:border-ink-muted',
            )}
          >
            All products
          </Link>
        </li>
        {categories.map((category) => {
          const key = categoryKey(category);
          const active = activeCategory === key;
          return (
            <li key={category.id}>
              <Link
                href={buildHref(key, preserveParams)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-display text-sm font-medium transition-colors',
                  active
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-surface text-ink hover:border-ink-muted',
                )}
              >
                {category.name}
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    active ? 'text-white/70' : 'text-ink-muted',
                  )}
                >
                  {category._count.products}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function CategoryListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="h-10 w-24 animate-pulse rounded-full bg-gray-200/70"
        />
      ))}
    </ul>
  );
}
