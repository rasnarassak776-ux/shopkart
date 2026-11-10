'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Container } from '@/components/ui';
import { OrderList } from '@/features/orders';
import { CUSTOMER_ROLES } from '@/lib/roles';

export default function CustomerOrdersPage() {
  return (
    <ProtectedRoute allowedRoles={CUSTOMER_ROLES}>
      <main className="min-h-screen bg-canvas py-6 sm:py-10">
        <Container>
          <div className="max-w-5xl mx-auto">
            <OrderList />
          </div>
        </Container>
      </main>
    </ProtectedRoute>
  );
}
