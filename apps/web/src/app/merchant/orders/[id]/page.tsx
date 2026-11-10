'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Container } from '@/components/ui';
import { OrderDetails, getAdminOrderById } from '@/features/orders';
import { MERCHANT_ROLES } from '@/lib/roles';

export default function MerchantOrderDetailsPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute allowedRoles={MERCHANT_ROLES}>
      <main className="min-h-screen bg-gray-50 py-8">
        <Container>
          <OrderDetails
            orderId={params.id}
            fetchOrder={getAdminOrderById}
            backHref="/merchant/orders"
            backLabel="Back to Orders"
          />
        </Container>
      </main>
    </ProtectedRoute>
  );
}
