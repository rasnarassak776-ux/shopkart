'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Button,
  Badge,
  ShoppingBagIcon,
  AlertCircleIcon,
  ShieldIcon,
  TruckIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { useCart } from '@/features/cart';
import { useCheckout } from '../checkout-context';
import { placeOrder } from '../checkout-api';

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CheckoutOrderReview() {
  const router = useRouter();
  const { cart, isLoading: cartLoading, hasUnavailableItems, isEmpty, refreshCart } = useCart();
  const { validation, selectedAddress, selectedPaymentMethod } = useCheckout();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState<string | null>(null);
  const [idempotencyKey] = useState<string>(() => generateUUID());

  const cartItems = cart?.items || [];
  const availableCount = cart?.summary.availableItems || 0;
  const totalCount = cart?.summary.totalItems || 0;
  const subtotal = cart?.summary.subtotal || '0.00';

  const isCod = selectedPaymentMethod === 'COD';
  const canPlaceOrder = validation.canProceed && !cartLoading && !isPlacingOrder && isCod;

  const handlePlaceOrder = async () => {
    if (!selectedAddress?.id) {
      setPlaceOrderError('Please select a delivery address');
      return;
    }

    if (!isCod) {
      setPlaceOrderError(
        'Online payment gateway is scheduled for Phase 8. Please select Cash on Delivery to place your order.',
      );
      return;
    }

    setIsPlacingOrder(true);
    setPlaceOrderError(null);

    try {
      const response = await placeOrder({
        addressId: selectedAddress.id,
        paymentMethod: 'COD',
        idempotencyKey,
      });

      // Synchronize cart state to reflect cart conversion
      await refreshCart();

      // Navigate to order confirmation
      router.push(`/orders/${response.orderId}/confirmation`);
    } catch (err: any) {
      setIsPlacingOrder(false);
      setPlaceOrderError(
        err.message || 'Unable to place order. Please review your cart and try again.',
      );
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h2 className={cn(textStyles.h3, 'text-ink')}>Order Review</h2>
          <p className={cn(textStyles.bodySm, 'text-ink-muted')}>
            {availableCount} of {totalCount} items ready
          </p>
        </div>
        <Link
          href="/cart"
          className="text-xs sm:text-sm font-semibold text-accent-700 hover:text-accent-800 transition-colors"
        >
          Edit Cart
        </Link>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {cartItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3 transition-colors',
              item.available
                ? 'border-line/70 bg-surface'
                : 'border-warning-200 bg-warning-50/40 opacity-75',
            )}
          >
            {/* Thumbnail */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted border border-line flex items-center justify-center">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <ShoppingBagIcon className="h-6 w-6 text-ink-muted" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/products/${item.productId}`}
                  className="text-xs sm:text-sm font-medium text-ink hover:text-accent-700 line-clamp-1 transition-colors"
                >
                  {item.name}
                </Link>
                <span className="text-xs sm:text-sm font-bold text-ink shrink-0">
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                <span>Qty: {item.quantity}</span>
                <span>×</span>
                <span>{formatCurrency(item.unitPrice)}</span>
                {!item.available && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5 ml-auto">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2 border-t border-line pt-4 text-xs sm:text-sm">
        <div className="flex justify-between text-ink-secondary">
          <span>Items Subtotal</span>
          <span className="font-semibold text-ink">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-secondary">
          <span>Estimated Delivery</span>
          <span className="font-semibold text-emerald-700">FREE</span>
        </div>
        <div className="border-t border-line pt-3 flex justify-between items-baseline">
          <span className={cn(textStyles.h3, 'text-ink')}>Total Amount</span>
          <span className="text-lg sm:text-xl font-black text-ink">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>

      {/* Delivery Target Preview */}
      {selectedAddress && (
        <div className="rounded-xl border border-line/60 bg-surface-muted/50 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between text-ink font-semibold">
            <span>Delivering to</span>
            <span className="text-[11px] font-normal text-ink-muted">
              {selectedPaymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
            </span>
          </div>
          <p className="font-bold text-ink">
            {selectedAddress.fullName} ({selectedAddress.phone})
          </p>
          <p className="text-ink-muted line-clamp-1">
            {selectedAddress.addressLine1}, {selectedAddress.city}, {selectedAddress.state} – {selectedAddress.postalCode}
          </p>
        </div>
      )}

      {/* Error Alert */}
      {placeOrderError && (
        <div
          role="alert"
          className="rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-800 space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircleIcon className="h-4 w-4 text-error-700 shrink-0" />
            <span>Order placement failed:</span>
          </div>
          <p className="text-error-900">{placeOrderError}</p>
        </div>
      )}

      {/* Validation Alert */}
      {!validation.isValid && (
        <div
          role="alert"
          className="rounded-xl border border-warning-200 bg-warning-50/70 p-3 text-xs text-warning-800 space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircleIcon className="h-4 w-4 text-warning-700 shrink-0" />
            <span>Complete steps to place order:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-warning-900">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Place Order CTA Button */}
      <div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={!canPlaceOrder}
          onClick={handlePlaceOrder}
          className="w-full font-bold shadow-md text-sm sm:text-base py-3.5"
        >
          {isPlacingOrder ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Placing Order...
            </span>
          ) : (
            `Place Order • ${formatCurrency(subtotal)}`
          )}
        </Button>

        {!isCod && (
          <p className="mt-2 text-center text-[11px] text-amber-700 font-medium">
            Online payment gateway will be available in Phase 8. Please select Cash on Delivery.
          </p>
        )}
        {isCod && (
          <p className="mt-2 text-center text-[11px] text-ink-muted">
            You will pay {formatCurrency(subtotal)} in cash upon product delivery.
          </p>
        )}
      </div>

      {/* Security & Trust Badges */}
      <div className="border-t border-line pt-4 grid grid-cols-2 gap-3 text-center text-xs text-ink-muted">
        <div className="flex items-center justify-center gap-1.5">
          <ShieldIcon className="h-4 w-4 text-accent-700" />
          <span>256-Bit Encrypted</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <TruckIcon className="h-4 w-4 text-accent-700" />
          <span>Safe Delivery</span>
        </div>
      </div>
    </div>
  );
}
