'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { Container } from '@/components/ui';
import { OrdersEmptyState } from '@/features/orders';

function CustomerOrdersContent() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <span className="inline-flex items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-700/10">
              Orders
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage your order history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/customer/dashboard"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <Link
            href="/products"
            className="rounded-lg bg-accent-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-800"
          >
            Browse Products
          </Link>
        </div>
      </div>

      <OrdersEmptyState
        title="No orders yet"
        description="You have not placed any orders yet. When you complete checkout, your order history and tracking details will appear here."
      />
    </div>
  );
}

export default function CustomerOrdersPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 py-8">
        <Container>
          <CustomerOrdersContent />
        </Container>
      </main>
    </ProtectedRoute>
  );
}
