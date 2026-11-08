'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Button,
  TrashIcon,
  ChevronRightIcon,
  AlertCircleIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import {
  useCart,
  CartItemRow,
  CartSummary,
  CartEmptyState,
  CartLoadingSkeleton,
  CartErrorState,
  ClearCartDialog,
} from '@/features/cart';

export default function CartPage() {
  const {
    cart,
    isLoading,
    isUpdating,
    error,
    updatingItemIds,
    totalItems,
    hasUnavailableItems,
    isEmpty,
    refreshCart,
    updateItem,
    removeItem,
    clearCart,
  } = useCart();

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearCart();
      setClearDialogOpen(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <main className="py-8 sm:py-12 bg-canvas min-h-[calc(100vh-14rem)]">
      <Container>
        {/* Breadcrumb navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-ink-muted">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="font-medium text-ink">Shopping Cart</span>
        </nav>

        {/* Page Content State Switcher */}
        {isLoading ? (
          <CartLoadingSkeleton />
        ) : error ? (
          <CartErrorState message={error} onRetry={refreshCart} />
        ) : isEmpty || !cart ? (
          <CartEmptyState />
        ) : (
          <div className="space-y-8">
            {/* Header with Title and Clear Action */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <h1 className={cn(textStyles.h1, 'text-ink flex items-center gap-3')}>
                  Shopping Cart
                  <span className="inline-flex items-center justify-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </span>
                </h1>
                <p className={cn(textStyles.bodySm, 'mt-1 text-ink-muted')}>
                  Review your selected items before proceeding to checkout.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/products"
                  className="text-sm font-semibold text-accent-600 hover:text-accent-700 hover:underline transition-colors"
                >
                  Continue shopping
                </Link>
                <span className="h-4 w-px bg-line" aria-hidden="true" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClearDialogOpen(true)}
                  disabled={isUpdating}
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                  Clear cart
                </Button>
              </div>
            </div>

            {/* Unavailable products banner */}
            {hasUnavailableItems && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
              >
                <AlertCircleIcon className="h-5 w-5 shrink-0 mt-0.5 text-warning" />
                <div>
                  <h4 className="font-bold">Items requiring attention</h4>
                  <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                    One or more products in your cart are no longer available in our catalog.
                    Please remove them from your cart to enable order checkout.
                  </p>
                </div>
              </div>
            )}

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
              {/* Main Column: Items List */}
              <div className="space-y-4 lg:col-span-8">
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    isUpdating={updatingItemIds.has(item.id)}
                    onUpdateQuantity={updateItem}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              {/* Side Column: Order Summary */}
              <div className="lg:col-span-4 lg:sticky lg:top-24">
                <CartSummary
                  summary={cart.summary}
                  hasUnavailableItems={hasUnavailableItems}
                  isEmpty={isEmpty}
                  isUpdating={isUpdating}
                />
              </div>
            </div>

            {/* Clear Cart Confirmation Dialog */}
            <ClearCartDialog
              open={clearDialogOpen}
              onClose={() => setClearDialogOpen(false)}
              onConfirm={handleConfirmClear}
              isClearing={isClearing}
            />
          </div>
        )}
      </Container>
    </main>
  );
}
