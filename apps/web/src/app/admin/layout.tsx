import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminLayout } from '@/components/admin';
import { ADMIN_ROLES } from '@/lib/roles';

export const metadata: Metadata = {
  title: 'Shopkart Admin',
};

/**
 * Every `/admin/*` route is gated by the shared ProtectedRoute (Member 1's auth):
 * unauthenticated users are sent to /login, other roles to their own dashboard.
 * Superadmins inherit admin functionality. The catalog API independently
 * enforces JWT + admin/superadmin role server-side.
 */
export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={ADMIN_ROLES}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
