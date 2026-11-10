'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminErrorState, AdminNotice, AdminPageHeader, AdminPanel } from '@/components/admin';
import {
  Badge,
  Button,
  buttonClasses,
  fieldClasses,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Skeleton,
  SpinnerIcon,
  ToastContainer,
  UsersIcon,
} from '@/components/ui';
import { useAdminToasts } from '@/features/admin/use-merchant-toasts';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { getMerchantAccounts, setMerchantAccountStatus } from './superadmin-api';
import type { MerchantAccount, MerchantAccountsResponse, MerchantStatusFilter } from './types';

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Deactivated'}</Badge>;
}

function RowActions({ merchant, pending, onToggle }: { merchant: MerchantAccount; pending: boolean; onToggle: (a: MerchantAccount) => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/superadmin/merchants/${merchant.id}`}
        className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'h-10 px-3' })}
        aria-label={`View ${merchant.name}`}
      >
        <PencilIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Manage</span>
      </Link>
      <button
        type="button"
        onClick={() => onToggle(merchant)}
        disabled={pending}
        className={buttonClasses({
          variant: 'secondary',
          size: 'sm',
          className: cn('h-10 min-w-[7.5rem]', merchant.isActive ? 'text-ink' : 'text-success'),
        })}
      >
        {pending && <SpinnerIcon className="h-4 w-4" />}
        {merchant.isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}

export function MerchantAccountManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [result, setResult] = useState<MerchantAccountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<MerchantStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setResult(await getMerchantAccounts({ search: debouncedSearch, status, page, limit: PAGE_SIZE }));
    } catch (err) {
      setError(errorMessage(err, 'Unable to load merchant accounts.'));
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const created = searchParams.get('created');
  useEffect(() => {
    if (created) {
      showToast('Merchant account created successfully.');
      router.replace('/superadmin/merchants', { scroll: false });
    }
  }, [created, showToast, router]);

  const handleToggle = async (merchant: MerchantAccount) => {
    if (merchant.isActive && !window.confirm(`Deactivate ${merchant.name}? They will be signed out of every session immediately.`)) {
      return;
    }
    setPendingIds((prev) => new Set(prev).add(merchant.id));
    try {
      const updated = await setMerchantAccountStatus(merchant.id, !merchant.isActive);
      showToast(`${updated.name} is now ${updated.isActive ? 'active' : 'deactivated'}.`);
      await load();
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update merchant status.'), 'error');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(merchant.id);
        return next;
      });
    }
  };

  const merchants = result?.data ?? [];
  const counts = result ? { all: result.summary.total, active: result.summary.active, inactive: result.summary.inactive } : null;

  return (
    <>
      <AdminPageHeader
        title="Merchant accounts"
        description="Create, review and deactivate merchants. Deactivating an merchant revokes all of their sessions immediately."
        actions={
          <Link href="/superadmin/merchants/create" className={buttonClasses({ variant: 'accent', size: 'md' })}>
            <PlusIcon className="h-4 w-4" />
            Create merchant
          </Link>
        }
      />

      {error && <AdminErrorState message={error} onRetry={load} />}

      {!error && (
        <AdminPanel>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <label htmlFor="merchant-search" className="sr-only">Search merchants</label>
              <input
                id="merchant-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                maxLength={100}
                className={cn(fieldClasses(), 'h-11 pl-9')}
              />
            </div>
            <div role="group" aria-label="Filter by status" className="inline-flex rounded-lg bg-surface-muted p-1">
              {(['all', 'active', 'inactive'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option);
                    setPage(1);
                  }}
                  aria-pressed={status === option}
                  className={cn(
                    'h-9 rounded-md px-3 text-sm font-medium capitalize transition-colors',
                    status === option ? 'bg-surface text-ink shadow-card' : 'text-ink-secondary hover:text-ink',
                  )}
                >
                  {option}
                  {counts && <span className="ml-1.5 text-xs tabular-nums text-ink-muted">{counts[option]}</span>}
                </button>
              ))}
            </div>
          </div>

          {!result && (
            <div className="space-y-3 p-4" aria-label="Loading merchant accounts">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {result && result.summary.total === 0 && (
            <AdminNotice
              icon={UsersIcon}
              title="No merchant accounts yet"
              description="Create the first store administrator to delegate catalog and order management."
              className="border-0 shadow-none"
              action={
                <Link href="/superadmin/merchants/create" className={buttonClasses({ size: 'sm' })}>
                  <PlusIcon className="h-4 w-4" />
                  Create merchant
                </Link>
              }
            />
          )}

          {result && result.summary.total > 0 && merchants.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-ink-muted">No merchant accounts match your filters.</p>
          )}

          {merchants.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3">Merchant</th>
                      <th scope="col" className="hidden px-4 py-3 lg:table-cell">Phone</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="hidden px-4 py-3 xl:table-cell">Created</th>
                      <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {merchants.map((merchant) => (
                      <tr key={merchant.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{merchant.name}</p>
                          <p className="text-xs text-ink-muted">{merchant.email}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-ink-secondary lg:table-cell">{merchant.phone ?? '—'}</td>
                        <td className="px-4 py-3"><StatusBadge active={merchant.isActive} /></td>
                        <td className="hidden px-4 py-3 text-ink-muted xl:table-cell">{dateFormat.format(new Date(merchant.createdAt))}</td>
                        <td className="px-4 py-3">
                          <RowActions merchant={merchant} pending={pendingIds.has(merchant.id)} onToggle={handleToggle} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line md:hidden">
                {merchants.map((merchant) => (
                  <li key={merchant.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{merchant.name}</p>
                        <p className="truncate text-xs text-ink-muted">{merchant.email}</p>
                      </div>
                      <StatusBadge active={merchant.isActive} />
                    </div>
                    <div className="mt-3">
                      <RowActions merchant={merchant} pending={pendingIds.has(merchant.id)} onToggle={handleToggle} />
                    </div>
                  </li>
                ))}
              </ul>

              {result && result.meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
                  <span className="text-ink-muted">
                    Page {result.meta.page} of {result.meta.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= result.meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </AdminPanel>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
