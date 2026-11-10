'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { Container } from '@/components/ui';
import { OrdersEmptyState } from '@/features/orders';
import { ADMIN_ROLES } from '@/lib/roles';

function AdminOrdersContent() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Admin Order Management</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-900/10">
              Admin Console
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            View, filter, and update customer order lifecycle statuses across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            ← Admin Dashboard
          </Link>
        </div>
      </div>

      <OrdersEmptyState
        title="No platform orders to manage"
        description="There are currently no customer orders placed in the system. When customers complete checkout, platform orders will be listed here with status management tools."
        action={{ label: 'Return to Dashboard', href: '/admin/dashboard' }}
      />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute allowedRoles={ADMIN_ROLES}>
      <main className="min-h-screen bg-gray-50 py-8">
        <Container>
          <AdminOrdersContent />
        </Container>
      </main>
    </ProtectedRoute>
  );
}
