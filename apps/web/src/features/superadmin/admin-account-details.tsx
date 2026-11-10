'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminErrorState, AdminPageHeader, AdminPanel } from '@/components/admin';
import { Badge, Button, Skeleton, SpinnerIcon, ToastContainer } from '@/components/ui';
import { useAdminToasts } from '@/features/admin/use-admin-toasts';
import { ApiError } from '@/lib/api-client';
import { AdminAccountForm } from './admin-account-form';
import { getAdminAccount, setAdminAccountStatus } from './superadmin-api';
import type { AdminAccount } from './types';

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

export function AdminAccountDetails({ adminId }: { adminId: string }) {
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAdmin(await getAdminAccount(adminId));
    } catch (err) {
      setError(errorMessage(err, 'Unable to load the admin account.'));
    }
  }, [adminId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async () => {
    if (!admin) return;
    if (admin.isActive && !window.confirm(`Deactivate ${admin.name}? They will be signed out of every session immediately.`)) {
      return;
    }
    setToggling(true);
    try {
      const updated = await setAdminAccountStatus(admin.id, !admin.isActive);
      setAdmin(updated);
      showToast(updated.isActive ? 'Admin account activated.' : 'Admin account deactivated.');
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update admin status.'), 'error');
    } finally {
      setToggling(false);
    }
  };

  if (error) return <AdminErrorState message={error} onRetry={load} />;

  if (!admin) {
    return (
      <div className="space-y-4" aria-label="Loading admin account">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={admin.name}
        description={admin.email}
        actions={
          <Button variant={admin.isActive ? 'secondary' : 'accent'} onClick={toggleStatus} disabled={toggling}>
            {toggling && <SpinnerIcon className="h-4 w-4" />}
            {admin.isActive ? 'Deactivate admin' : 'Activate admin'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminAccountForm
            key={admin.updatedAt}
            admin={admin}
            onSaved={(updated) => {
              setAdmin(updated);
              showToast('Admin account updated successfully.');
            }}
          />
        </div>

        <AdminPanel className="h-fit p-5">
          <h2 className="font-display text-base font-semibold text-ink">Account status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Role</dt>
              <dd><Badge variant="accent" className="capitalize">{admin.role}</Badge></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <Badge variant={admin.isActive ? 'success' : 'neutral'}>{admin.isActive ? 'Active' : 'Deactivated'}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Created</dt>
              <dd className="text-right text-ink">{dateTimeFormat.format(new Date(admin.createdAt))}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Last updated</dt>
              <dd className="text-right text-ink">{dateTimeFormat.format(new Date(admin.updatedAt))}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Account ID</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-ink-secondary">{admin.id}</dd>
            </div>
          </dl>
          {!admin.isActive && (
            <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs text-ink-secondary">
              This admin cannot sign in and all previous sessions were revoked when the account was deactivated.
            </p>
          )}
        </AdminPanel>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
