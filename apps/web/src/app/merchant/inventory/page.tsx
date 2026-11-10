'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader, AdminPanel } from '@/components/admin';
import { Button, Input, Skeleton, SpinnerIcon, ToastContainer } from '@/components/ui';
import { useAdminToasts } from '@/features/admin/use-merchant-toasts';
import {
  getAdminInventory,
  updateAdminInventory,
  type AdminInventoryItem,
} from '@/features/admin/admin-catalog-api';
import { ApiError } from '@/lib/api-client';

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

/** Merchant inventory management: stock levels for the caller's own products only. */
export default function MerchantInventoryPage() {
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [items, setItems] = useState<AdminInventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminInventory();
      setItems(data);
      setDrafts(Object.fromEntries(data.map((i) => [i.productId, String(i.availableQuantity)])));
    } catch (err) {
      setError(errorMessage(err, 'Unable to load inventory.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (item: AdminInventoryItem) => {
    const value = parseInt(drafts[item.productId] ?? '', 10);
    if (Number.isNaN(value) || value < 0) {
      showToast('Available quantity must be a whole number of zero or more.', 'error');
      return;
    }
    if (value === item.availableQuantity) return;
    setSavingId(item.productId);
    try {
      const updated = await updateAdminInventory(item.productId, value);
      setItems((prev) => prev?.map((i) => (i.productId === item.productId ? updated : i)) ?? null);
      setDrafts((prev) => ({ ...prev, [item.productId]: String(updated.availableQuantity) }));
      showToast(`Stock updated for ${item.name}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update inventory.'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description="Available stock for your products. Reserved units are held by confirmed orders."
      />

      {error && (
        <AdminPanel className="mt-6 p-5">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </AdminPanel>
      )}

      {!error && !items && (
        <AdminPanel className="mt-6 space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </AdminPanel>
      )}

      {!error && items && items.length === 0 && (
        <AdminPanel className="mt-6 p-10 text-center">
          <p className="text-sm text-ink-muted">
            No products yet. Create a product first, then manage its stock here.
          </p>
        </AdminPanel>
      )}

      {!error && items && items.length > 0 && (
        <AdminPanel className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Product</th>
                <th scope="col" className="px-4 py-3">SKU</th>
                <th scope="col" className="px-4 py-3">Reserved</th>
                <th scope="col" className="px-4 py-3">Available</th>
                <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.productId} className="hover:bg-surface-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{item.name}</p>
                    {!item.isActive && <p className="text-xs text-ink-muted">Inactive</p>}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{item.sku}</td>
                  <td className="px-4 py-3 text-ink-secondary">{item.reservedQuantity}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`Available quantity for ${item.name}`}
                      value={drafts[item.productId] ?? ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [item.productId]: e.target.value }))
                      }
                      className="h-9 w-28"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={savingId === item.productId}
                      onClick={() => save(item)}
                    >
                      {savingId === item.productId && <SpinnerIcon className="h-4 w-4" />}
                      Save
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
