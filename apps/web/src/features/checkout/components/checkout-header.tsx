'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, CheckIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

export function CheckoutHeader() {
  return (
    <div className="mb-8 space-y-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-ink-muted">
        <Link href="/" className="hover:text-ink transition-colors">
          Home
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <Link href="/cart" className="hover:text-ink transition-colors">
          Shopping Cart
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <span className="font-medium text-ink" aria-current="page">
          Checkout
        </span>
      </nav>

      {/* Title & Back to Cart Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={cn(textStyles.h1, 'text-ink')}>Secure Checkout</h1>
          <p className={cn(textStyles.bodySm, 'mt-1 text-ink-muted')}>
            Review your items, select delivery address, and choose your payment method.
          </p>
        </div>

        <Link
          href="/cart"
          className="inline-flex items-center text-sm font-semibold text-accent-700 hover:text-accent-800 transition-colors"
        >
          ← Back to Shopping Cart
        </Link>
      </div>

      {/* Visual Step Indicator */}
      <div className="pt-2">
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          {/* Step 1: Cart */}
          <Link
            href="/cart"
            className="flex items-center gap-2 font-medium text-accent-700 hover:underline"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 text-accent-700 font-bold">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            <span>Cart</span>
          </Link>

          <span className="h-0.5 w-6 sm:w-12 bg-line" />

          {/* Step 2: Checkout Prep */}
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-white font-bold">
              2
            </span>
            <span>Delivery & Review</span>
          </div>

          <span className="h-0.5 w-6 sm:w-12 bg-line" />

          {/* Step 3: Order Placement */}
          <div className="flex items-center gap-2 font-medium text-ink-muted">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-ink-muted font-bold border border-line">
              3
            </span>
            <span className="hidden sm:inline">Order Placement</span>
            <span className="sm:hidden">Place Order</span>
          </div>
        </div>
      </div>
    </div>
  );
}
