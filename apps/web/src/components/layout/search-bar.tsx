'use client';

import React, { useId, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SearchIcon } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Header search. Submitting navigates to /products?search=<query> so the
 * catalog page owns search state; on the catalog page itself the term is
 * merged into the existing URL params (read at submit time, client-only).
 */
export function SearchBar({ className }: { className?: string }) {
  const inputId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');

  const submit = (value: string) => {
    const q = value.trim();
    if (pathname === '/products') {
      const params = new URLSearchParams(window.location.search);
      if (q) params.set('search', q);
      else params.delete('search');
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : '/products');
    } else {
      router.push(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
    }
  };

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(query);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Search Shopkart
      </label>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
      <input
        id={inputId}
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products and brands"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-11 w-full rounded-lg border border-line-strong bg-surface-muted pl-11 pr-24 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-accent-600 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-600/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        className="absolute inset-y-1 right-1 inline-flex items-center rounded-md bg-accent-600 px-4 font-display text-sm font-semibold text-white transition-colors hover:bg-accent-700"
      >
        Search
      </button>
    </form>
  );
}
