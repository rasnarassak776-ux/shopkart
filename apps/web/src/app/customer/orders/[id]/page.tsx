'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Container, Button } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

function OrderDetailsContent() {
  const params = useParams();
  const orderId = params?.id as string;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 font-mono">
            ID: {orderId || '—'}
          </p>
        </div>
        <Link href="/customer/orders">
          <Button variant="secondary" size="sm">
            ← Back to orders
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
        <h2 className={cn(textStyles.h3, 'text-ink')}>Order Tracking & Inspection</h2>
        <p className={cn(textStyles.bodySm, 'mt-2 text-ink-muted max-w-md mx-auto')}>
          Detailed order tracking, timeline, items summary, and immutable address snapshot view will be wired to the Order Service in Phase 3.
        </p>
        <Link href="/customer/orders" className="mt-6 inline-block">
          <Button variant="primary" size="sm">
            View All Orders
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 py-8">
        <Container>
          <OrderDetailsContent />
        </Container>
      </main>
    </ProtectedRoute>
  );
}
