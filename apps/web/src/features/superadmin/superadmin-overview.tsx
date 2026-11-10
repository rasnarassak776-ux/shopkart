'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminErrorState, AdminPageHeader, AdminPanel, AdminStatCard, type AdminStatStatus } from '@/components/admin';
import { ArrowRightIcon, buttonClasses, CheckIcon, ClipboardIcon, PlusIcon, ShieldIcon, Skeleton, UsersIcon } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';
import { getMerchantAccounts, getRecentAuditLogs } from './superadmin-api';
import { describeAuditLog } from './merchant-account-utils';
import type { MerchantAccountsResponse, AuditLogEntry } from './types';

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

export function SuperadminOverview() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MerchantAccountsResponse['summary'] | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accounts, recent] = await Promise.all([getMerchantAccounts({ limit: 1 }), getRecentAuditLogs(8)]);
      setSummary(accounts.summary);
      setLogs(recent);
    } catch (err) {
      setError(errorMessage(err, 'Unable to load platform overview.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const status: AdminStatStatus = loading ? 'loading' : summary ? 'ready' : 'unavailable';
  const firstName = user?.name?.split(' ')[0] || user?.email.split('@')[0];

  return (
    <>
      <AdminPageHeader
        title="Platform overview"
        description={`Welcome back${firstName ? `, ${firstName}` : ''}. Manage administrator access and review privileged activity.`}
        actions={
          <Link href="/superadmin/merchants/create" className={buttonClasses({ variant: 'accent', size: 'md' })}>
            <PlusIcon className="h-4 w-4" />
            Create merchant
          </Link>
        }
      />

      {error && <AdminErrorState message={error} onRetry={load} />}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Merchant accounts" value={summary?.total} status={status} icon={UsersIcon} />
        <AdminStatCard label="Active merchants" value={summary?.active} status={status} icon={CheckIcon} tone="success" />
        <AdminStatCard label="Deactivated merchants" value={summary?.inactive} status={status} icon={ShieldIcon} tone="neutral" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <AdminPanel className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Recent privileged activity</h2>
            <ClipboardIcon className="h-5 w-5 text-ink-muted" />
          </div>
          {loading && (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
          {!loading && logs && logs.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">No privileged actions have been recorded yet.</p>
          )}
          {!loading && logs && logs.length > 0 && (
            <ul className="divide-y divide-line">
              {logs.map((log) => {
                const { title, detail } = describeAuditLog(log);
                return (
                  <li key={log.id} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{title}</p>
                      <p className="truncate text-xs text-ink-muted">{detail}</p>
                    </div>
                    <time className="shrink-0 text-xs text-ink-muted" dateTime={log.createdAt}>
                      {dateTimeFormat.format(new Date(log.createdAt))}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel className="p-5">
          <h2 className="font-display text-base font-semibold text-ink">Quick actions</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {[
              { href: '/superadmin/merchants', label: 'Manage merchant accounts' },
              { href: '/superadmin/merchants/create', label: 'Create a new merchant' },
              { href: '/merchant', label: 'Open store merchant console' },
              { href: '/superadmin/settings', label: 'Platform settings' },
            ].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group flex min-h-[44px] items-center justify-between rounded-lg px-2 font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink">
                  {link.label}
                  <ArrowRightIcon className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </>
  );
}
