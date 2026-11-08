import type { Metadata } from 'next';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminLayout } from '@/components/admin';

export const metadata: Metadata = {
  title: 'Shopkart Admin',
};

/**
 * Every `/admin/*` route is gated by the shared ProtectedRoute (Member 1's auth):
 * unauthenticated users are sent to /login, non-admins to /customer/dashboard.
 * The catalog API independently enforces JWT + admin role server-side.
 */
export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
