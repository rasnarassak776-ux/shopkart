'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, ChevronRightIcon, ShoppingBagIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { presentationFeaturedProducts } from '@/features/storefront/presentation-data';
import { formatCurrency, formatShortDate } from '../order-utils';
import { OrderStatusBadge, PaymentStatusBadge } from './order-status-badge';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
  /** Override the details link (merchant console uses its own order pages). */
  detailHref?: string;
}

export function OrderCard({ order, detailHref }: OrderCardProps) {
  const payment = order.payment || (order.payments && order.payments[0]);
  const items = order.items || [];
  const itemCount =
    order.itemCount ??
    items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-card transition-all hover:border-line-strong hover:shadow-md overflow-hidden">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted/40 p-4 sm:px-6 text-xs text-ink-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              Order Placed
            </span>
            <span className="font-semibold text-ink">
              {formatShortDate(order.createdAt)}
            </span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-line" />
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              Total Amount
            </span>
            <span className="font-bold text-ink">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-line" />
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              Ship To
            </span>
            <span className="font-semibold text-ink line-clamp-1">
              {order.addressSnapshot?.fullName || 'Customer'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-muted">
            #{order.id.slice(0, 8)}...
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Main Body: Thumbnails & Items Info */}
      <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <PaymentStatusBadge
              status={payment?.paymentStatus}
              method={payment?.paymentMethod}
            />
            <span className="text-xs text-ink-muted">
              • {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Item Thumbnails Row */}
          <div className="flex flex-wrap items-center gap-3">
            {items.slice(0, 4).map((item) => {
              const fallback = presentationFeaturedProducts.find(
                (p) => p.id === item.productId,
              );
              const imgSrc = item.imageUrl || fallback?.image?.src;

              return (
                <div
                  key={item.id}
                  className="group relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-muted/30 overflow-hidden"
                  title={`${item.name || item.productNameSnapshot} (Qty: ${item.quantity})`}
                >
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={item.name || item.productNameSnapshot || 'Product item'}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <ShoppingBagIcon className="h-6 w-6 text-ink-muted" />
                  )}
                  {item.quantity > 1 && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-ink/80 px-1.5 py-0.2 text-[10px] font-bold text-white backdrop-blur-xs">
                      ×{item.quantity}
                    </span>
                  )}
                </div>
              );
            })}

            {items.length > 4 && (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-muted text-xs font-bold text-ink-muted">
                +{items.length - 4} more
              </div>
            )}

            <div className="pl-1">
              <p className="font-semibold text-sm text-ink line-clamp-1">
                {items[0]?.name || items[0]?.productNameSnapshot || 'Shopkart Item'}
              </p>
              {items.length > 1 && (
                <p className="text-xs text-ink-muted">
                  and {items.length - 1} other {items.length - 1 === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center justify-end">
          <Link href={detailHref ?? `/orders/${order.id}`} className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full sm:w-auto font-semibold">
              View Order Details
              <ChevronRightIcon className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
