'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Badge,
  Button,
  CheckIcon,
  ChevronLeftIcon,
  MapPinIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldIcon,
  AlertCircleIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { getOrderById } from '../orders-api';
import { presentationFeaturedProducts } from '@/features/storefront/presentation-data';
import { formatCurrency, formatDate } from '../order-utils';
import { OrderStatusBadge, PaymentStatusBadge } from './order-status-badge';
import { OrderTimeline } from './order-timeline';
import { OrderLoadingSkeleton, OrderErrorState } from '../order-states';
import type { Order } from '../types';

interface OrderDetailsProps {
  orderId: string;
}

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(
        err.message ||
          'Unable to load order details. Please verify your order reference or permissions.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleCopyId = () => {
    if (order?.id) {
      navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-6 sm:py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/customer/orders">
            <Button variant="secondary" size="sm">
              <ChevronLeftIcon className="mr-1 h-4 w-4" />
              Back to My Orders
            </Button>
          </Link>
        </div>
        <OrderLoadingSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-6 sm:py-10 space-y-6">
        <Link href="/customer/orders">
          <Button variant="secondary" size="sm">
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            Back to My Orders
          </Button>
        </Link>
        <OrderErrorState
          message={error || 'Order not found or access restricted.'}
          onRetry={fetchOrder}
        />
      </div>
    );
  }

  const payment = order.payment || (order.payments && order.payments[0]);
  const address = order.addressSnapshot;
  const items = order.items || [];
  const itemCount =
    order.itemCount ??
    items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="py-4 sm:py-8 space-y-8">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/customer/orders"
              className="text-xs font-semibold text-accent-700 hover:text-accent-800 transition-colors"
            >
              ← Back to My Orders
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={cn(textStyles.h2, 'text-ink')}>Order Details</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="font-mono">Reference: {order.id}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-accent-700 hover:bg-accent-50 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <span>• Placed on {formatDate(order.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/products">
            <Button variant="secondary" size="sm" className="font-semibold">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Items & Timeline */}
        <div className="lg:col-span-2 space-y-8">
          {/* Purchased Items Card */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBagIcon className="h-5 w-5 text-accent-700" />
                <h2 className={cn(textStyles.h3, 'text-ink')}>
                  Purchased Items ({itemCount})
                </h2>
              </div>
            </div>

            <div className="divide-y divide-line">
              {items.map((item) => {
                const fallback = presentationFeaturedProducts.find(
                  (p) => p.id === item.productId,
                );
                const imgSrc = item.imageUrl || fallback?.image?.src;
                const unitPrice =
                  item.unitPrice || item.unitPriceSnapshot || '0.00';
                const totalPrice =
                  item.totalPrice ||
                  (parseFloat(unitPrice) * item.quantity).toFixed(2);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-muted/30 overflow-hidden">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={item.name || item.productNameSnapshot || 'Product item'}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingBagIcon className="h-8 w-8 text-ink-muted" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm sm:text-base text-ink line-clamp-2">
                        {item.name || item.productNameSnapshot || 'Shopkart Product'}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        Qty: <strong className="text-ink">{item.quantity}</strong> × {formatCurrency(unitPrice)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm sm:text-base text-ink">
                        {formatCurrency(totalPrice)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Calculations */}
            <div className="border-t border-line pt-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Delivery Charges</span>
                <span className="font-bold text-emerald-700">FREE</span>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-sm sm:text-base font-bold text-ink">
                <span>Total Amount</span>
                <span className="text-accent-700">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Lifecycle Timeline */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className={cn(textStyles.h3, 'text-ink')}>Order Tracking & Status Lifecycle</h2>
              <p className={cn(textStyles.bodySm, 'text-ink-muted mt-0.5')}>
                Real-time chronological events recorded for this order.
              </p>
            </div>

            <OrderTimeline
              history={order.statusHistory}
              currentStatus={order.status}
            />
          </div>
        </div>

        {/* Right Column (1 Col): Delivery & Payment Information */}
        <div className="space-y-6">
          {/* Delivery Address Snapshot Card */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-ink font-bold border-b border-line pb-3">
              <TruckIcon className="h-5 w-5 text-accent-700" />
              <h3 className={cn(textStyles.h3, 'text-ink')}>Delivery Address</h3>
            </div>

            {address ? (
              <div className="text-xs sm:text-sm text-ink-secondary space-y-1.5 leading-relaxed">
                <p className="font-bold text-ink text-sm sm:text-base">
                  {address.fullName}
                </p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}, {address.state} – {address.postalCode}
                </p>
                <p>{address.country || 'India'}</p>
                <div className="pt-2 border-t border-line text-ink-muted">
                  Phone: <strong className="text-ink">{address.phone}</strong>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Delivery address snapshot unavailable.</p>
            )}
          </div>

          {/* Payment Snapshot Card */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2 text-ink font-bold border-b border-line pb-3">
              <CreditCardIcon className="h-5 w-5 text-accent-700" />
              <h3 className={cn(textStyles.h3, 'text-ink')}>Payment Information</h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Method:</span>
                <span className="font-semibold text-ink">
                  {payment?.paymentMethod === 'COD'
                    ? 'Cash on Delivery (COD)'
                    : payment?.paymentMethod || 'COD'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Status:</span>
                <PaymentStatusBadge
                  status={payment?.paymentStatus}
                  method={payment?.paymentMethod}
                />
              </div>

              <div className="flex justify-between items-center border-t border-line pt-2">
                <span className="text-ink-muted">Amount:</span>
                <span className="font-bold text-ink">
                  {formatCurrency(payment?.amount || order.totalAmount)}
                </span>
              </div>
            </div>

            {payment?.paymentMethod === 'COD' && (
              <div className="rounded-xl border border-line/80 bg-surface-muted/60 p-3 text-xs text-ink-secondary space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <ShieldIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>Cash on Delivery</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Please keep exact cash ready of{' '}
                  <strong className="text-ink">{formatCurrency(order.totalAmount)}</strong>{' '}
                  for handover upon delivery.
                </p>
              </div>
            )}
          </div>

          {/* Support / Quick Help Card */}
          <div className="rounded-2xl border border-line bg-surface-muted/30 p-5 shadow-xs space-y-2 text-xs text-ink-muted">
            <p className="font-bold text-ink">Need assistance with your order?</p>
            <p>
              Contact Shopkart customer support with your Order ID (<span className="font-mono text-ink">#{order.id.slice(0, 8)}</span>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
