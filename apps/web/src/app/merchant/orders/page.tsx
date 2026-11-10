'use client';

import React, { Suspense } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Container } from '@/components/ui';
import { MerchantOrderList } from '@/features/orders';
import { MERCHANT_ROLES } from '@/lib/roles';

function MerchantOrdersContent() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <MerchantOrderList />
    </div>
  );
}

export default function MerchantOrdersPage() {
  return (
    <ProtectedRoute allowedRoles={MERCHANT_ROLES}>
      <main className="min-h-screen bg-gray-50 py-8">
        <Container>
          <Suspense>
            <MerchantOrdersContent />
          </Suspense>
        </Container>
      </main>
    </ProtectedRoute>
  );
}
