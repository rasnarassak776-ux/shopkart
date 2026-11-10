'use client';

import { ProtectedRoute } from '@/components/protected-route';
import { CUSTOMER_ROLES } from '@/lib/roles';
import CartPage from '../../cart/page';

/** Signed-in customer view of the shared cart page (`/cart`). */
export default function CustomerCartPage() {
  return (
    <ProtectedRoute allowedRoles={CUSTOMER_ROLES}>
      <CartPage />
    </ProtectedRoute>
  );
}
