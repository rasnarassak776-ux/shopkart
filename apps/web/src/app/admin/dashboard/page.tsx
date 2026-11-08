import { redirect } from 'next/navigation';

/**
 * Legacy entry point: login, ProtectedRoute and account menus send admins to
 * /admin/dashboard. The dashboard overview now lives at /admin.
 */
export default function AdminDashboardRedirect() {
  redirect('/admin');
}
