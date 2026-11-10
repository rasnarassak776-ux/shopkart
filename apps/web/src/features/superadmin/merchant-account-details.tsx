'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminErrorState, AdminPageHeader, AdminPanel } from '@/components/admin';
import { Badge, Button, Skeleton, SpinnerIcon, ToastContainer } from '@/components/ui';
import { useAdminToasts } from '@/features/admin/use-merchant-toasts';
import { ApiError } from '@/lib/api-client';
import { MerchantAccountForm } from './merchant-account-form';
import { getMerchantAccount, setMerchantAccountStatus } from './superadmin-api';
import type { MerchantAccount } from './types';

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

export function MerchantAccountDetails({ merchantId }: { merchantId: string }) {
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [merchant, setMerchant] = useState<MerchantAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMerchant(await getMerchantAccount(merchantId));
    } catch (err) {
      setError(errorMessage(err, 'Unable to load the merchant account.'));
    }
  }, [merchantId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async () => {
    if (!merchant) return;
    if (merchant.isActive && !window.confirm(`Deactivate ${merchant.name}? They will be signed out of every session immediately.`)) {
      return;
    }
    setToggling(true);
    try {
      const updated = await setMerchantAccountStatus(merchant.id, !merchant.isActive);
      setMerchant(updated);
      showToast(updated.isActive ? 'Merchant account activated.' : 'Merchant account deactivated.');
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update merchant status.'), 'error');
    } finally {
      setToggling(false);
    }
  };

  if (error) return <AdminErrorState message={error} onRetry={load} />;

  if (!merchant) {
    return (
      <div className="space-y-4" aria-label="Loading merchant account">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={merchant.name}
        description={merchant.email}
        actions={
          <Button variant={merchant.isActive ? 'secondary' : 'accent'} onClick={toggleStatus} disabled={toggling}>
            {toggling && <SpinnerIcon className="h-4 w-4" />}
            {merchant.isActive ? 'Deactivate merchant' : 'Activate merchant'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MerchantAccountForm
            key={merchant.updatedAt}
            merchant={merchant}
            onSaved={(updated) => {
              setMerchant(updated);
              showToast('Merchant account updated successfully.');
            }}
          />
        </div>

        <AdminPanel className="h-fit p-5">
          <h2 className="font-display text-base font-semibold text-ink">Account status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Role</dt>
              <dd><Badge variant="accent" className="capitalize">{merchant.role}</Badge></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <Badge variant={merchant.isActive ? 'success' : 'neutral'}>{merchant.isActive ? 'Active' : 'Deactivated'}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Created</dt>
              <dd className="text-right text-ink">{dateTimeFormat.format(new Date(merchant.createdAt))}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Last updated</dt>
              <dd className="text-right text-ink">{dateTimeFormat.format(new Date(merchant.updatedAt))}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Account ID</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-ink-secondary">{merchant.id}</dd>
            </div>
          </dl>
          {!merchant.isActive && (
            <p className="mt-4 rounded-lg bg-surface-muted p-3 text-xs text-ink-secondary">
              This merchant cannot sign in and all previous sessions were revoked when the account was deactivated.
            </p>
          )}
        </AdminPanel>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
