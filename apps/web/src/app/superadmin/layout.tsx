import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminLayout } from '@/components/admin';
import { SUPERADMIN_ROLES } from '@/lib/roles';

export const metadata: Metadata = {
  title: 'Shopkart Superadmin',
};

/**
 * `/superadmin/*` is superadmin-only. Customers and merchants are redirected to their
 * own dashboards; the auth service independently enforces the superadmin role
 * on every merchant-management endpoint.
 */
export default function SuperadminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={SUPERADMIN_ROLES}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
