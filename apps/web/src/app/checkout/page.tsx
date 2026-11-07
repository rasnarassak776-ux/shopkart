'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Button,
  ShoppingBagIcon,
  AlertCircleIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/features/cart';
import {
  CheckoutProvider,
  CheckoutHeader,
  DeliveryAddressSection,
  PaymentMethodSection,
  CheckoutOrderReview,
  CheckoutLoadingSkeleton,
} from '@/features/checkout';

function CheckoutContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { cart, isLoading: cartLoading, hasUnavailableItems, isEmpty } = useCart();

  // Protect route: Redirect guests to login with safe returnUrl
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?returnUrl=%2Fcheckout');
    }
  }, [authLoading, isAuthenticated, router]);

  // Loading state
  if (authLoading || (cartLoading && (!cart || cart.items.length === 0))) {
    return (
      <Container className="py-8 sm:py-12">
        <CheckoutLoadingSkeleton />
      </Container>
    );
  }

  // Guest view while redirecting
  if (!isAuthenticated) {
    return (
      <Container className="py-8 sm:py-12">
        <CheckoutLoadingSkeleton />
      </Container>
    );
  }

  // Empty cart state
  if (!cart || isEmpty || cart.items.length === 0) {
    return (
      <Container className="py-8 sm:py-12">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-8 sm:p-12 text-center shadow-card max-w-lg mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-accent-700 mb-4">
            <ShoppingBagIcon className="h-8 w-8" />
          </div>
          <h2 className={cn(textStyles.h2, 'text-ink')}>Your Cart is Empty</h2>
          <p className={cn(textStyles.body, 'mt-2 text-ink-muted')}>
            You cannot proceed to checkout without items in your shopping cart. Add items from our catalog to get started.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/products" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                Browse Products
              </Button>
            </Link>
            <Link href="/cart" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                View Cart
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-6 sm:py-10">
      <CheckoutHeader />

      {/* Unavailable Items Warning Banner */}
      {hasUnavailableItems && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800"
        >
          <AlertCircleIcon className="h-5 w-5 shrink-0 text-warning-700 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Items in your cart are currently unavailable</p>
            <p className="mt-0.5 text-xs text-warning-700">
              One or more products have been discontinued or are out of stock. Please remove them from your cart to enable order placement.
            </p>
            <Link
              href="/cart"
              className="mt-2 inline-block text-xs font-bold underline hover:opacity-80"
            >
              Return to Cart to Remove Items →
            </Link>
          </div>
        </div>
      )}

      {/* 2-Column Checkout Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Delivery Address & Payment Method */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <DeliveryAddressSection />
          <PaymentMethodSection />
        </div>

        {/* Right Column: Order Review (Sticky on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
          <CheckoutOrderReview />
        </div>
      </div>
    </Container>
  );
}

export default function CheckoutPage() {
  return (
    <CheckoutProvider>
      <main className="min-h-[calc(100vh-14rem)] bg-surface-muted/20 pb-16">
        <CheckoutContent />
      </main>
    </CheckoutProvider>
  );
}
