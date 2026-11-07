'use client';

import React from 'react';
import Link from 'next/link';
import { Button, AlertCircleIcon, ShieldIcon, TruckIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { CartSummaryData } from '../types';
import { formatCurrency } from './cart-item-row';

interface CartSummaryProps {
  summary: CartSummaryData;
  hasUnavailableItems: boolean;
  isEmpty: boolean;
  isUpdating?: boolean;
}

export function CartSummary({
  summary,
  hasUnavailableItems,
  isEmpty,
  isUpdating = false,
}: CartSummaryProps) {
  const isCheckoutDisabled = isEmpty || summary.availableItems === 0 || hasUnavailableItems || isUpdating;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-6">
      <h2 className={cn(textStyles.h3, 'text-ink')}>Order summary</h2>

      <div className="space-y-3.5 text-sm">
        <div className="flex items-center justify-between text-ink-secondary">
          <span>Total items saved</span>
          <span className="font-semibold text-ink">{summary.totalItems}</span>
        </div>

        <div className="flex items-center justify-between text-ink-secondary">
          <span>Purchasable items</span>
          <span className="font-semibold text-ink">{summary.availableItems}</span>
        </div>

        <div className="flex items-center justify-between text-ink-secondary">
          <span>Delivery</span>
          <span className="font-medium text-ink-muted">Calculated at checkout</span>
        </div>

        <div className="border-t border-line pt-3.5 flex items-baseline justify-between">
          <span className="text-base font-bold text-ink">Subtotal</span>
          <div className="text-right">
            <span className="font-display text-xl sm:text-2xl font-bold text-accent-700">
              {formatCurrency(summary.subtotal)}
            </span>
            <p className="text-[11px] text-ink-muted">Exact backend calculation (taxes & shipping in Phase 4)</p>
          </div>
        </div>
      </div>

      {/* Unavailable Items Warning */}
      {hasUnavailableItems && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-xs text-warning"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">
            Your cart contains unavailable products. Please remove them before proceeding to checkout.
          </p>
        </div>
      )}

      {/* Checkout Action Button */}
      <div className="space-y-2">
        {isCheckoutDisabled ? (
          <Button
            variant="accent"
            size="lg"
            fullWidth
            disabled
            className="opacity-50 cursor-not-allowed"
          >
            {hasUnavailableItems ? 'Remove unavailable items' : 'Proceed to checkout'}
          </Button>
        ) : (
          <Link href="/checkout" className="block">
            <Button variant="accent" size="lg" fullWidth>
              Proceed to checkout
            </Button>
          </Link>
        )}

        <p className="text-center text-[11px] text-ink-muted">
          Order placement & payment finalized in Phase 5
        </p>
      </div>

      {/* Trust & Guarantee signals */}
      <div className="border-t border-line pt-4 space-y-2.5 text-xs text-ink-secondary">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-4 w-4 text-accent-600 shrink-0" />
          <span>Safe & secure 256-bit encrypted checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <TruckIcon className="h-4 w-4 text-accent-600 shrink-0" />
          <span>Free delivery on eligible orders</span>
        </div>
      </div>
    </div>
  );
}
