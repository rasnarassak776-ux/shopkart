'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminErrorState, AdminNotice, AdminPageHeader, AdminPanel } from '@/components/admin';
import {
  Badge,
  buttonClasses,
  fieldClasses,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Skeleton,
  SpinnerIcon,
  TagIcon,
  ToastContainer,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { getAdminCategories, setAdminCategoryStatus } from './admin-catalog-api';
import { filterCategories, type CategoryStatusFilter } from './category-utils';
import type { AdminCategory } from './types';
import { useAdminToasts } from './use-merchant-toasts';

const SAVED_MESSAGES: Record<string, string> = {
  created: 'Category created successfully.',
  updated: 'Category updated successfully.',
};

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

interface RowActionsProps {
  category: AdminCategory;
  pending: boolean;
  onToggle: (category: AdminCategory) => void;
}

function RowActions({ category, pending, onToggle }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/merchant/categories/${category.id}/edit`}
        className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'h-10 px-3' })}
        aria-label={`Edit ${category.name}`}
      >
        <PencilIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Edit</span>
      </Link>
      <button
        type="button"
        onClick={() => onToggle(category)}
        disabled={pending}
        className={buttonClasses({
          variant: 'secondary',
          size: 'sm',
          className: cn('h-10 min-w-[7.5rem]', category.isActive ? 'text-ink' : 'text-success'),
        })}
      >
        {pending && <SpinnerIcon className="h-4 w-4" />}
        {category.isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}

export function CategoryManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CategoryStatusFilter>('all');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setError(null);
    try {
      setCategories(await getAdminCategories());
    } catch (err) {
      setError(errorMessage(err, 'Unable to load categories.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saved = searchParams.get('saved');
  useEffect(() => {
    if (saved && SAVED_MESSAGES[saved]) {
      showToast(SAVED_MESSAGES[saved]);
      router.replace('/merchant/categories', { scroll: false });
    }
  }, [saved, showToast, router]);

  const handleToggle = async (category: AdminCategory) => {
    setPendingIds((prev) => new Set(prev).add(category.id));
    try {
      const updated = await setAdminCategoryStatus(category.id, !category.isActive);
      setCategories((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev);
      showToast(`"${updated.name}" is now ${updated.isActive ? 'active' : 'inactive'}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update category status.'), 'error');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(category.id);
        return next;
      });
    }
  };

  const visible = useMemo(() => filterCategories(categories ?? [], search, status), [categories, search, status]);
  const counts = useMemo(() => {
    const all = categories ?? [];
    const active = all.filter((c) => c.isActive).length;
    return { all: all.length, active, inactive: all.length - active };
  }, [categories]);

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Organise the storefront catalog. Inactive categories are hidden from customers but keep their products and subcategories."
        actions={
          <Link href="/merchant/categories/new" className={buttonClasses({ variant: 'accent', size: 'md' })}>
            <PlusIcon className="h-4 w-4" />
            New category
          </Link>
        }
      />

      {error && <AdminErrorState message={error} onRetry={load} />}

      {!error && (
        <AdminPanel>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <label htmlFor="category-search" className="sr-only">
                Search categories
              </label>
              <input
                id="category-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, slug or parent"
                className={cn(fieldClasses(), 'h-11 pl-9')}
              />
            </div>
            <div role="group" aria-label="Filter by status" className="inline-flex rounded-lg bg-surface-muted p-1">
              {(['all', 'active', 'inactive'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  aria-pressed={status === option}
                  className={cn(
                    'h-9 rounded-md px-3 text-sm font-medium capitalize transition-colors',
                    status === option ? 'bg-surface text-ink shadow-card' : 'text-ink-secondary hover:text-ink',
                  )}
                >
                  {option}
                  {categories && <span className="ml-1.5 text-xs tabular-nums text-ink-muted">{counts[option]}</span>}
                </button>
              ))}
            </div>
          </div>

          {!categories && (
            <div className="space-y-3 p-4" aria-label="Loading categories">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {categories && categories.length === 0 && (
            <AdminNotice
              icon={TagIcon}
              title="No categories yet"
              description="Create your first category to start organising the catalog."
              className="border-0 shadow-none"
              action={
                <Link href="/merchant/categories/new" className={buttonClasses({ size: 'sm' })}>
                  <PlusIcon className="h-4 w-4" />
                  New category
                </Link>
              }
            />
          )}

          {categories && categories.length > 0 && visible.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-ink-muted">No categories match your filters.</p>
          )}

          {visible.length > 0 && (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3">Category</th>
                      <th scope="col" className="px-4 py-3">Parent</th>
                      <th scope="col" className="px-4 py-3 text-right">Products</th>
                      <th scope="col" className="hidden px-4 py-3 text-right lg:table-cell">Subcategories</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="hidden px-4 py-3 xl:table-cell">Updated</th>
                      <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((category) => (
                      <tr key={category.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{category.name}</p>
                          <p className="text-xs text-ink-muted">/{category.slug ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-ink-secondary">{category.parent?.name ?? <span className="text-ink-muted">Top level</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink">{category._count.products}</td>
                        <td className="hidden px-4 py-3 text-right tabular-nums text-ink lg:table-cell">{category._count.children}</td>
                        <td className="px-4 py-3"><StatusBadge active={category.isActive} /></td>
                        <td className="hidden px-4 py-3 text-ink-muted xl:table-cell">{dateFormat.format(new Date(category.updatedAt))}</td>
                        <td className="px-4 py-3">
                          <RowActions category={category} pending={pendingIds.has(category.id)} onToggle={handleToggle} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-line md:hidden">
                {visible.map((category) => (
                  <li key={category.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{category.name}</p>
                        <p className="truncate text-xs text-ink-muted">/{category.slug ?? '—'}</p>
                      </div>
                      <StatusBadge active={category.isActive} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-ink-muted">Parent</dt>
                        <dd className="truncate font-medium text-ink">{category.parent?.name ?? 'Top level'}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-muted">Products</dt>
                        <dd className="font-medium tabular-nums text-ink">{category._count.products}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-muted">Subcategories</dt>
                        <dd className="font-medium tabular-nums text-ink">{category._count.children}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <RowActions category={category} pending={pendingIds.has(category.id)} onToggle={handleToggle} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AdminPanel>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
