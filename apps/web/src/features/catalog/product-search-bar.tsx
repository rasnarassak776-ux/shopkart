'use client';

import React, { useEffect, useId, useState } from 'react';
import { CloseIcon, SearchIcon } from '@/components/ui';
import { cn } from '@/lib/cn';

interface ProductSearchBarProps {
  /** Current committed search query from the URL. */
  value: string;
  /** Called with the submitted (or cleared) query. */
  onSubmit: (query: string) => void;
  className?: string;
}

/**
 * Submit-based product search for the catalog page. Searches are only sent
 * to the API when the form is submitted (or cleared), never per keystroke.
 */
export function ProductSearchBar({ value, onSubmit, className }: ProductSearchBarProps) {
  const inputId = useId();
  const [query, setQuery] = useState(value);

  // Keep the input in sync when the URL changes (back/forward, shared links).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(query.trim());
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Search products
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
      <input
        id={inputId}
        type="search"
        name="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, brands and SKUs"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-11 pr-20 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-accent-600 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-600/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute inset-y-1 right-1 flex items-center gap-1">
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onSubmit('');
            }}
            aria-label="Clear search"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-accent-600 px-4 font-display text-sm font-semibold text-white transition-colors hover:bg-accent-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
