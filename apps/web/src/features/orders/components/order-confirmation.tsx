'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  CheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldIcon,
  AlertCircleIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { getOrderById } from '../orders-api';
import { formatCurrency, formatDate } from '../order-utils';
import type { Order } from '../types';
import { OrderLoadingSkeleton } from '../order-states';

export { formatCurrency, formatDate };

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrderById(orderId);
        if (isMounted) {
          setOrder(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err.message || 'Unable to load order details. Please verify your order reference.',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (orderId) {
      fetchOrder();
    }

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleCopyOrderId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="h-8 w-64 bg-surface-muted rounded-lg animate-pulse mx-auto" />
          <div className="h-4 w-96 bg-surface-muted rounded-lg animate-pulse mx-auto" />
        </div>
        <OrderLoadingSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-50 text-error-600">
          <AlertCircleIcon className="h-8 w-8" />
        </div>
        <h1 className={cn(textStyles.h2, 'text-ink')}>Order Not Found</h1>
        <p className={cn(textStyles.bodySm, 'text-ink-muted')}>
          {error || `We could not find an order matching reference "${orderId}".`}
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link href="/products">
            <Button variant="primary" size="md">
              Continue Shopping
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary" size="md">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const payment = order.payments && order.payments.length > 0 ? order.payments[0] : null;
  const address = order.addressSnapshot;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Celebration Header */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
          <CheckIcon className="h-8 w-8 stroke-[3]" />
        </div>
        <div>
          <Badge variant="success" className="mb-2 px-3 py-1 text-xs uppercase tracking-wider font-bold">
            Order Confirmed
          </Badge>
          <h1 className={cn(textStyles.h1, 'text-ink')}>Thank you for your order!</h1>
          <p className={cn(textStyles.bodySm, 'mt-2 text-ink-secondary max-w-lg mx-auto')}>
            We have received your order and our fulfillment team is preparing it for shipment. A confirmation summary is detailed below.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-muted">
          <span>Order Reference:</span>
          <code className="rounded bg-white px-2 py-1 font-mono font-bold text-ink border border-line">
            {order.id}
          </code>
          <button
            type="button"
            onClick={handleCopyOrderId}
            className="text-accent-700 hover:text-accent-800 font-semibold underline text-xs"
          >
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-ink-muted">Placed On</span>
          <p className="mt-1 text-sm font-bold text-ink">{formatDate(order.createdAt)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-ink-muted">Payment Method</span>
          <p className="mt-1 text-sm font-bold text-ink flex items-center gap-1.5">
            <span>Cash on Delivery</span>
            <Badge variant="accent" className="text-[10px] py-0 px-1.5">
              COD
            </Badge>
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-ink-muted">Payment Status</span>
          <p className="mt-1 text-sm font-bold text-amber-700">
            {payment?.paymentStatus === 'COD_PENDING' || order.status === 'PENDING'
              ? 'Pay ₹' + order.totalAmount + ' on Delivery'
              : payment?.paymentStatus || 'Pending'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ordered Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className={cn(textStyles.h3, 'text-ink')}>Ordered Products</h2>
              <span className="text-xs text-ink-muted font-medium">
                {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-muted border border-line flex items-center justify-center text-ink-muted">
                      <ShoppingBagIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink line-clamp-1">
                        {item.name || item.productNameSnapshot || 'Product'}
                      </h4>
                      <p className="text-xs text-ink-muted">
                        Qty: {item.quantity} × {formatCurrency(item.unitPriceSnapshot || item.unitPrice || '0.00')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-ink shrink-0">
                    {formatCurrency(parseFloat(item.unitPriceSnapshot || item.unitPrice || '0') * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-line pt-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-ink-secondary">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-ink-secondary">
                <span>Shipping Delivery</span>
                <span className="font-semibold text-emerald-700">FREE</span>
              </div>
              <div className="border-t border-line pt-3 flex justify-between items-baseline">
                <span className={cn(textStyles.h3, 'text-ink')}>Total Payable on Delivery</span>
                <span className="text-xl font-black text-ink">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address & Next Steps */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold border-b border-line pb-3">
              <TruckIcon className="h-4 w-4 text-accent-700" />
              <h3 className={cn(textStyles.h3, 'text-ink')}>Delivery Address</h3>
            </div>
            {address ? (
              <div className="text-xs text-ink-secondary space-y-1">
                <p className="font-bold text-sm text-ink">{address.fullName}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}, {address.state} – {address.postalCode}
                </p>
                <p>{address.country || 'India'}</p>
                <p className="pt-2 text-ink-muted">Phone: {address.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Delivery address saved on file.</p>
            )}
          </div>

          {/* Payment Guidance Card */}
          <div className="rounded-2xl border border-line/70 bg-surface-muted/60 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-ink font-bold">
              <ShieldIcon className="h-4 w-4 text-emerald-700" />
              <h3 className={cn(textStyles.h3, 'text-ink')}>Cash on Delivery Instructions</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Please keep the exact amount of{' '}
              <strong className="text-ink">{formatCurrency(order.totalAmount)}</strong> ready in cash
              when our delivery partner arrives at your address.
            </p>
          </div>

          {/* Navigation Actions */}
          <div className="space-y-2 pt-2">
            <Link href="/products" className="block">
              <Button variant="primary" size="lg" className="w-full font-bold">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="secondary" size="md" className="w-full">
                Return to Storefront
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
