'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPageHeader, AdminPanel } from '@/components/admin';
import { Button, Input, Skeleton, SpinnerIcon, ToastContainer } from '@/components/ui';
import { useAdminToasts } from '@/features/admin/use-merchant-toasts';
import {
  adjustAdminInventory,
  decreaseAdminInventory,
  getAdminInventory,
  getAdminStockHistory,
  increaseAdminInventory,
  updateAdminInventoryThreshold,
  type AdminInventoryItem,
  type InventoryListResponse,
  type InventoryStockStatus,
  type StockMovement,
} from '@/features/admin/admin-catalog-api';
import { getMerchantAccounts } from '@/features/superadmin/superadmin-api';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@shopkart/common';
import { ApiError } from '@/lib/api-client';

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

const statusLabel: Record<InventoryStockStatus, string> = {
  IN_STOCK: 'In stock',
  LOW_STOCK: 'Low stock',
  OUT_OF_STOCK: 'Out of stock',
};

function statusClass(status: InventoryStockStatus) {
  if (status === 'IN_STOCK') return 'bg-emerald-50 text-emerald-700';
  if (status === 'LOW_STOCK') return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function MerchantInventoryPage() {
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const { user } = useAuth();
  const isSuperadmin = user?.role === UserRole.SUPERADMIN;
  const [inventory, setInventory] = useState<InventoryListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [search, setSearch] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [merchants, setMerchants] = useState<Array<{ id: string; name?: string; email?: string }>>([]);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ product: AdminInventoryItem; mode: 'increase' | 'decrease' | 'adjust' | 'threshold' } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<AdminInventoryItem | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminInventory({
        page,
        limit: 20,
        status,
        search,
        merchantId: isSuperadmin ? merchantId || undefined : undefined,
      });
      setInventory(data);
    } catch (err) {
      setError(errorMessage(err, 'Unable to load inventory.'));
    }
  }, [page, status, search, merchantId, isSuperadmin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSuperadmin) return;
    getMerchantAccounts({ limit: 100 }).then((res) => setMerchants(res.data)).catch(() => setMerchants([]));
  }, [isSuperadmin]);

  const openAction = (product: AdminInventoryItem, mode: typeof action extends null ? never : NonNullable<typeof action>['mode']) => {
    setAction({ product, mode });
    setQuantity('');
    setReason('');
    setThreshold(String(product.lowStockThreshold));
  };

  const submitAction = async () => {
    if (!action) return;
    const qty = parseInt(quantity, 10);
    if (action.mode !== 'threshold') {
      if (action.mode === 'adjust' ? Number.isNaN(qty) || qty === 0 : Number.isNaN(qty) || qty <= 0) {
        showToast(action.mode === 'adjust' ? 'Enter a non-zero whole-number quantity.' : 'Enter a positive whole-number quantity.', 'error');
        return;
      }
      if (!reason.trim()) {
        showToast('A reason is required for stock adjustments.', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      let updated: AdminInventoryItem;
      if (action.mode === 'increase') updated = await increaseAdminInventory(action.product.productId, qty, reason.trim());
      else if (action.mode === 'decrease') updated = await decreaseAdminInventory(action.product.productId, qty, reason.trim());
      else if (action.mode === 'adjust') updated = await adjustAdminInventory(action.product.productId, qty, reason.trim());
      else {
        const thresholdValue = parseInt(threshold, 10);
        if (Number.isNaN(thresholdValue) || thresholdValue < 0) throw new Error('Threshold must be zero or greater.');
        updated = await updateAdminInventoryThreshold(action.product.productId, thresholdValue);
      }
      setInventory((prev) => prev ? { ...prev, data: prev.data.map((i) => i.productId === updated.productId ? updated : i) } : prev);
      showToast(`${action.product.name} inventory updated.`);
      setAction(null);
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update inventory.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async (product: AdminInventoryItem) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await getAdminStockHistory({ productId: product.productId, limit: 50 });
      setHistory(res.data);
    } catch (err) {
      showToast(errorMessage(err, 'Unable to load stock history.'), 'error');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const summaryCards = useMemo(() => inventory?.summary ?? { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 }, [inventory]);

  return (
    <>
      <AdminPageHeader title="Inventory" description="Manage stock, low-stock thresholds, and audited stock movements." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ['Total products', summaryCards.totalProducts],
          ['In stock', summaryCards.inStock],
          ['Low stock', summaryCards.lowStock],
          ['Out of stock', summaryCards.outOfStock],
        ] as const).map(([label, value]) => (
          <AdminPanel key={label} className="p-5">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
          </AdminPanel>
        ))}
      </div>

      <AdminPanel className="mt-6 flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase text-ink-muted" htmlFor="inventory-search">Search</label>
          <Input id="inventory-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, SKU, or brand" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-ink-muted" htmlFor="inventory-status">Status</label>
          <select id="inventory-status" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }} className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm">
            <option value="all">All products</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </div>
        {isSuperadmin && (
          <div className="min-w-56">
            <label className="text-xs font-semibold uppercase text-ink-muted" htmlFor="inventory-merchant">Merchant</label>
            <select id="inventory-merchant" value={merchantId} onChange={(e) => { setMerchantId(e.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm">
              <option value="">All merchants</option>
              {merchants.map((m) => <option key={m.id} value={m.id}>{m.name || m.email || m.id}</option>)}
            </select>
          </div>
        )}
      </AdminPanel>

      {error && <AdminPanel className="mt-6 p-5"><p className="text-sm text-red-600">{error}</p><Button variant="secondary" size="sm" className="mt-3" onClick={load}>Retry</Button></AdminPanel>}
      {!error && !inventory && <AdminPanel className="mt-6 space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</AdminPanel>}
      {!error && inventory && inventory.data.length === 0 && <AdminPanel className="mt-6 p-10 text-center"><p className="text-sm text-ink-muted">No inventory products match the current filters.</p></AdminPanel>}

      {!error && inventory && inventory.data.length > 0 && (
        <AdminPanel className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                {isSuperadmin && <th className="px-4 py-3">Merchant</th>}
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Reserved</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inventory.data.map((item) => (
                <tr key={item.productId} className="hover:bg-surface-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-surface-muted" />}
                      <div><p className="font-medium text-ink">{item.name}</p>{!item.isActive && <p className="text-xs text-ink-muted">Inactive</p>}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{item.sku}</td>
                  {isSuperadmin && <td className="px-4 py-3 text-ink-secondary">{item.merchantId ?? 'Platform'}</td>}
                  <td className="px-4 py-3 font-semibold text-ink">{item.availableQuantity}</td>
                  <td className="px-4 py-3 text-ink-secondary">{item.reservedQuantity}</td>
                  <td className="px-4 py-3 text-ink-secondary">{item.lowStockThreshold}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(item.stockStatus)}`}>{statusLabel[item.stockStatus]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openAction(item, 'increase')}>+ Stock</Button>
                      <Button size="sm" variant="secondary" onClick={() => openAction(item, 'decrease')}>− Stock</Button>
                      {isSuperadmin && <Button size="sm" variant="secondary" onClick={() => openAction(item, 'adjust')}>Adjust</Button>}
                      <Button size="sm" variant="secondary" onClick={() => openAction(item, 'threshold')}>Threshold</Button>
                      <Button size="sm" variant="secondary" onClick={() => loadHistory(item)}>History</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-muted">
            <span>Page {inventory.pagination.page} of {inventory.pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= inventory.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </AdminPanel>
      )}

      {action && (
        <AdminPanel className="fixed inset-x-4 bottom-4 top-24 z-20 mx-auto max-w-lg overflow-y-auto p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-ink">{action.mode === 'threshold' ? 'Update low-stock threshold' : `${action.mode[0].toUpperCase()}${action.mode.slice(1)} stock`} — {action.product.name}</h3>
          {action.mode === 'threshold' ? (
            <div className="mt-4"><label className="text-sm font-medium text-ink">Low-stock threshold</label><Input className="mt-1" type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></div>
          ) : (
            <div className="mt-4 space-y-3">
              <div><label className="text-sm font-medium text-ink">Quantity{action.mode === 'adjust' ? ' (negative reduces)' : ''}</label><Input className="mt-1" type="number" min={action.mode === 'adjust' ? -1000000 : 1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-ink">Reason</label><Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required audit reason" /></div>
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
            <Button onClick={submitAction} disabled={saving}>{saving && <SpinnerIcon className="h-4 w-4" />} Save</Button>
          </div>
        </AdminPanel>
      )}

      {historyProduct && (
        <AdminPanel className="fixed inset-x-4 bottom-4 top-24 z-20 mx-auto max-w-3xl overflow-y-auto p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-lg font-semibold text-ink">Stock history — {historyProduct.name}</h3><p className="text-sm text-ink-muted">Latest movements first. History is read-only.</p></div>
            <Button variant="secondary" size="sm" onClick={() => setHistoryProduct(null)}>Close</Button>
          </div>
          <div className="mt-4 space-y-2">
            {historyLoading && <Skeleton className="h-10 w-full" />}
            {!historyLoading && history.length === 0 && <p className="text-sm text-ink-muted">No stock movements recorded.</p>}
            {history.map((m) => (
              <div key={m.id} className="rounded-md border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{m.actionType.replace(/_/g, ' ')}</span>
                  <span className="text-ink-muted">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-ink-secondary">{m.previousQuantity} → {m.newQuantity} ({m.quantityChanged > 0 ? '+' : ''}{m.quantityChanged}){m.reason ? ` · ${m.reason}` : ''}</p>
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
