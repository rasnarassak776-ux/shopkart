'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircleIcon,
  Button,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardIcon,
  PackageIcon,
  SearchIcon,
  TruckIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { getMerchantOrders } from '../orders-api';
import { OrderCard } from './order-card';
import {
  OrdersEmptyState,
  OrderLoadingSkeleton,
  OrderErrorState,
} from '../order-states';
import type { Order, OrderStatus } from '../types';

const STATUS_FILTERS: Array<{ id: string; label: string; value?: OrderStatus }> = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING', label: 'Pending', value: 'PENDING' },
  { id: 'CONFIRMED', label: 'Confirmed', value: 'CONFIRMED' },
  { id: 'PROCESSING', label: 'Processing', value: 'PROCESSING' },
  { id: 'SHIPPED', label: 'Shipped', value: 'SHIPPED' },
  { id: 'DELIVERED', label: 'Delivered', value: 'DELIVERED' },
  { id: 'CANCELLED', label: 'Cancelled', value: 'CANCELLED' },
];

/**
 * Merchant console order list with metric cards, search, status filtering, and pagination.
 * Results are strictly scoped to the authenticated merchant's products and items.
 */
export function MerchantOrderList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatusParam = searchParams.get('status') || 'ALL';
  const currentPageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentSearchParam = searchParams.get('search') || '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(currentPageParam);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>(currentStatusParam);
  const [searchInput, setSearchInput] = useState<string>(currentSearchParam);
  const [activeSearch, setActiveSearch] = useState<string>(currentSearchParam);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status breakdown metrics
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });

  const fetchOrders = useCallback(
    async (targetPage: number, statusFilterId: string, querySearch: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const filterItem = STATUS_FILTERS.find((f) => f.id === statusFilterId);
        const query: { page: number; limit: number; status?: OrderStatus; search?: string } = {
          page: targetPage,
          limit: 10,
        };
        if (filterItem?.value) {
          query.status = filterItem.value;
        }
        if (querySearch.trim()) {
          query.search = querySearch.trim();
        }

        const res = await getMerchantOrders(query);
        const fetchedOrders = res.data || [];
        setOrders(fetchedOrders);
        const fetchedTotal = res.pagination?.total ?? res.total ?? 0;
        setTotal(fetchedTotal);
        setPage(res.pagination?.page ?? res.page ?? targetPage);
        setTotalPages(res.pagination?.totalPages ?? res.totalPages ?? 1);

        // Fetch counts for metric cards if viewing all orders without search
        if (statusFilterId === 'ALL' && !querySearch.trim()) {
          const [pendingRes, procRes, shipRes, delivRes] = await Promise.allSettled([
            getMerchantOrders({ status: 'PENDING', limit: 1 }),
            getMerchantOrders({ status: 'PROCESSING', limit: 1 }),
            getMerchantOrders({ status: 'SHIPPED', limit: 1 }),
            getMerchantOrders({ status: 'DELIVERED', limit: 1 }),
          ]);

          setMetrics({
            total: fetchedTotal,
            pending: pendingRes.status === 'fulfilled' ? (pendingRes.value.pagination?.total ?? pendingRes.value.total ?? 0) : 0,
            processing: procRes.status === 'fulfilled' ? (procRes.value.pagination?.total ?? procRes.value.total ?? 0) : 0,
            shipped: shipRes.status === 'fulfilled' ? (shipRes.value.pagination?.total ?? shipRes.value.total ?? 0) : 0,
            delivered: delivRes.status === 'fulfilled' ? (delivRes.value.pagination?.total ?? delivRes.value.total ?? 0) : 0,
          });
        }
      } catch (err: any) {
        setError(
          err.message ||
            'Unable to connect to the server. Please check your network connection.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchOrders(page, selectedFilter, activeSearch);
  }, [page, selectedFilter, activeSearch, fetchOrders]);

  const updateUrlParams = (newFilter: string, newPage: number, newSearch: string) => {
    const params = new URLSearchParams();
    if (newFilter !== 'ALL') params.set('status', newFilter);
    if (newPage > 1) params.set('page', String(newPage));
    if (newSearch) params.set('search', newSearch);
    const qs = params.toString();
    router.push(qs ? `?${qs}` : window.location.pathname);
  };

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    setPage(1);
    updateUrlParams(filterId, 1, activeSearch);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    updateUrlParams(selectedFilter, newPage, activeSearch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSearch = searchInput.trim();
    setActiveSearch(cleanSearch);
    setPage(1);
    updateUrlParams(selectedFilter, 1, cleanSearch);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
    updateUrlParams(selectedFilter, 1, '');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className={cn(textStyles.h1, 'text-ink')}>Order Management</h1>
          <p className={cn(textStyles.bodySm, 'mt-1 text-ink-muted')}>
            Monitor customer orders, review delivery addresses, inspect payment collections, and govern lifecycle transitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchOrders(page, selectedFilter, activeSearch)}
            disabled={isLoading}
            className="font-semibold"
          >
            Refresh
          </Button>
          <Link href="/merchant/dashboard">
            <Button variant="secondary" size="sm" className="font-semibold">
              ← Merchant Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-medium">Total Orders</span>
            <span className="rounded-lg bg-orange-50 p-1.5 text-orange-600">
              <ClipboardIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-ink">{metrics.total}</div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-medium">Pending Orders</span>
            <span className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
              <AlertCircleIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-ink">{metrics.pending}</div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-medium">Processing Orders</span>
            <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
              <PackageIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-ink">{metrics.processing}</div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-medium">Shipped Orders</span>
            <span className="rounded-lg bg-purple-50 p-1.5 text-purple-600">
              <TruckIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-ink">{metrics.shipped}</div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-card col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-ink-muted mb-2">
            <span className="text-xs font-medium">Delivered Orders</span>
            <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <CheckIcon className="h-4 w-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-ink">{metrics.delivered}</div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-line bg-surface p-3 shadow-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((f) => {
            const isActive = selectedFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600',
                  isActive
                    ? 'bg-accent-700 text-white shadow-xs'
                    : 'bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-ink',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Order ID..."
              className="w-48 sm:w-64 rounded-lg border border-line-strong bg-surface pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            />
            <SearchIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-muted" />
          </div>
          <Button type="submit" variant="primary" size="sm" className="text-xs px-3 py-1.5 h-auto">
            Search
          </Button>
          {activeSearch && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearSearch}
              className="text-xs px-2.5 py-1.5 h-auto"
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* Main Content States */}
      {isLoading ? (
        <OrderLoadingSkeleton />
      ) : error ? (
        <OrderErrorState message={error} onRetry={() => fetchOrders(page, selectedFilter, activeSearch)} />
      ) : orders.length === 0 ? (
        <OrdersEmptyState
          title={
            activeSearch
              ? `No orders matching "${activeSearch}"`
              : selectedFilter === 'ALL'
                ? 'No orders found'
                : `No ${selectedFilter.toLowerCase()} orders`
          }
          description={
            activeSearch
              ? 'Try searching with a different Order ID or clear the search filter.'
              : selectedFilter === 'ALL'
                ? 'There are currently no customer orders placed containing your products.'
                : `You have no orders currently in "${selectedFilter}" status.`
          }
          action={
            activeSearch
              ? { label: 'Clear search', href: '/merchant/orders' }
              : { label: 'Back to dashboard', href: '/merchant/dashboard' }
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-muted px-1">
            <span>
              Showing {orders.length} of {total} {total === 1 ? 'order' : 'orders'}
              {activeSearch && ` matching "${activeSearch}"`}
            </span>
            {totalPages > 1 && (
              <span>
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} detailHref={`/merchant/orders/${order.id}`} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line pt-6 px-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="font-medium"
              >
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <span className="text-xs font-semibold text-ink">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="font-medium"
              >
                Next
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
