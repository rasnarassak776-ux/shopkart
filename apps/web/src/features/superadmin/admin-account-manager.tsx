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
import { useAdminToasts } from '@/features/admin/use-admin-toasts';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { getAdminAccounts, setAdminAccountStatus } from './superadmin-api';
import type { AdminAccount, AdminAccountsResponse, AdminStatusFilter } from './types';

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Deactivated'}</Badge>;
}

function RowActions({ admin, pending, onToggle }: { admin: AdminAccount; pending: boolean; onToggle: (a: AdminAccount) => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/superadmin/admins/${admin.id}`}
        className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'h-10 px-3' })}
        aria-label={`View ${admin.name}`}
      >
        <PencilIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Manage</span>
      </Link>
      <button
        type="button"
        onClick={() => onToggle(admin)}
        disabled={pending}
        className={buttonClasses({
          variant: 'secondary',
          size: 'sm',
          className: cn('h-10 min-w-[7.5rem]', admin.isActive ? 'text-ink' : 'text-success'),
        })}
      >
        {pending && <SpinnerIcon className="h-4 w-4" />}
        {admin.isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}

export function AdminAccountManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [result, setResult] = useState<AdminAccountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<AdminStatusFilter>('all');
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
      setResult(await getAdminAccounts({ search: debouncedSearch, status, page, limit: PAGE_SIZE }));
    } catch (err) {
      setError(errorMessage(err, 'Unable to load admin accounts.'));
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const created = searchParams.get('created');
  useEffect(() => {
    if (created) {
      showToast('Admin account created successfully.');
      router.replace('/superadmin/admins', { scroll: false });
    }
  }, [created, showToast, router]);

  const handleToggle = async (admin: AdminAccount) => {
    if (admin.isActive && !window.confirm(`Deactivate ${admin.name}? They will be signed out of every session immediately.`)) {
      return;
    }
    setPendingIds((prev) => new Set(prev).add(admin.id));
    try {
      const updated = await setAdminAccountStatus(admin.id, !admin.isActive);
      showToast(`${updated.name} is now ${updated.isActive ? 'active' : 'deactivated'}.`);
      await load();
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update admin status.'), 'error');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(admin.id);
        return next;
      });
    }
  };

  const admins = result?.data ?? [];
  const counts = result ? { all: result.summary.total, active: result.summary.active, inactive: result.summary.inactive } : null;

  return (
    <>
      <AdminPageHeader
        title="Admin accounts"
        description="Create, review and deactivate store administrators. Deactivating an admin revokes all of their sessions immediately."
        actions={
          <Link href="/superadmin/admins/create" className={buttonClasses({ variant: 'accent', size: 'md' })}>
            <PlusIcon className="h-4 w-4" />
            Create admin
          </Link>
        }
      />

      {error && <AdminErrorState message={error} onRetry={load} />}

      {!error && (
        <AdminPanel>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <label htmlFor="admin-search" className="sr-only">Search admins</label>
              <input
                id="admin-search"
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
            <div className="space-y-3 p-4" aria-label="Loading admin accounts">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {result && result.summary.total === 0 && (
            <AdminNotice
              icon={UsersIcon}
              title="No admin accounts yet"
              description="Create the first store administrator to delegate catalog and order management."
              className="border-0 shadow-none"
              action={
                <Link href="/superadmin/admins/create" className={buttonClasses({ size: 'sm' })}>
                  <PlusIcon className="h-4 w-4" />
                  Create admin
                </Link>
              }
            />
          )}

          {result && result.summary.total > 0 && admins.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-ink-muted">No admin accounts match your filters.</p>
          )}

          {admins.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3">Admin</th>
                      <th scope="col" className="hidden px-4 py-3 lg:table-cell">Phone</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="hidden px-4 py-3 xl:table-cell">Created</th>
                      <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{admin.name}</p>
                          <p className="text-xs text-ink-muted">{admin.email}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-ink-secondary lg:table-cell">{admin.phone ?? '—'}</td>
                        <td className="px-4 py-3"><StatusBadge active={admin.isActive} /></td>
                        <td className="hidden px-4 py-3 text-ink-muted xl:table-cell">{dateFormat.format(new Date(admin.createdAt))}</td>
                        <td className="px-4 py-3">
                          <RowActions admin={admin} pending={pendingIds.has(admin.id)} onToggle={handleToggle} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line md:hidden">
                {admins.map((admin) => (
                  <li key={admin.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{admin.name}</p>
                        <p className="truncate text-xs text-ink-muted">{admin.email}</p>
                      </div>
                      <StatusBadge active={admin.isActive} />
                    </div>
                    <div className="mt-3">
                      <RowActions admin={admin} pending={pendingIds.has(admin.id)} onToggle={handleToggle} />
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
