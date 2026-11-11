'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { getCustomerOrders } from '../orders-api';
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

export function OrderList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatusParam = searchParams.get('status') || 'ALL';
  const currentPageParam = parseInt(searchParams.get('page') || '1', 10);

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(currentPageParam);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>(currentStatusParam);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (targetPage: number, statusFilterId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const filterItem = STATUS_FILTERS.find((f) => f.id === statusFilterId);
        const query: { page: number; limit: number; status?: OrderStatus } = {
          page: targetPage,
          limit: 10,
        };
        if (filterItem?.value) {
          query.status = filterItem.value;
        }

        const res = await getCustomerOrders(query);
        setOrders(res.data || []);
        setTotal(res.pagination?.total ?? res.total ?? 0);
        setPage(res.pagination?.page ?? res.page ?? targetPage);
        setTotalPages(res.pagination?.totalPages ?? res.totalPages ?? 1);
      } catch (err: any) {
        setError(
          err.message ||
            'Unable to load your orders right now. Please verify your connection and try again.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchOrders(page, selectedFilter);
  }, [page, selectedFilter, fetchOrders]);

  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (filterId === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', filterId);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className={cn(textStyles.h1, 'text-ink')}>My Orders</h1>
          <p className={cn(textStyles.bodySm, 'mt-1 text-ink-muted')}>
            View and track your previous orders and delivery status.
          </p>
        </div>

        <Link href="/products">
          <Button variant="primary" size="sm" className="font-semibold">
            Browse Catalog
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFilterChange(f.id)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600',
                isActive
                  ? 'bg-accent-700 text-white shadow-xs'
                  : 'bg-surface border border-line text-ink-secondary hover:bg-surface-muted hover:text-ink',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <OrderLoadingSkeleton />
      ) : error ? (
        <OrderErrorState message={error} onRetry={() => fetchOrders(page, selectedFilter)} />
      ) : orders.length === 0 ? (
        <OrdersEmptyState
          title={selectedFilter === 'ALL' ? 'No orders placed yet' : `No ${selectedFilter.toLowerCase()} orders`}
          description={
            selectedFilter === 'ALL'
              ? 'You have not placed any orders yet. Discover our catalog and find something you love.'
              : `You have no orders currently in "${selectedFilter}" status.`
          }
          action={{ label: 'Start shopping', href: '/products' }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-muted px-1">
            <span>
              Showing {orders.length} of {total} {total === 1 ? 'order' : 'orders'}
            </span>
            {totalPages > 1 && (
              <span>
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                allowCancellation
                onCancelled={(updated) =>
                  setOrders((prev) =>
                    prev.map((o) => (o.id === updated.id ? updated : o)),
                  )
                }
              />
            ))}
          </div>

          {/* Pagination Controls */}
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
