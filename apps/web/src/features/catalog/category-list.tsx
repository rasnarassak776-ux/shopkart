import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { CatalogCategory } from './types';

interface CategoryListProps {
  categories: CatalogCategory[];
  /** Slug or id of the currently selected category; null/undefined = all products. */
  activeCategory?: string | null;
}

function categoryKey(category: CatalogCategory): string {
  return category.slug ?? category.id;
}

/**
 * Horizontal category filter for the storefront. Each chip links to
 * /products?category=<slug|id> so the selection is shareable and
 * survives refreshes.
 */
export function CategoryList({ categories, activeCategory }: CategoryListProps) {
  return (
    <nav aria-label="Product categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/products"
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
                href={`/products?category=${encodeURIComponent(key)}`}
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
