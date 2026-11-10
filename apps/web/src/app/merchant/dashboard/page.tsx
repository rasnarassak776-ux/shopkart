import { redirect } from 'next/navigation';

/**
 * Legacy entry point: login, ProtectedRoute and account menus send merchants to
 * /merchant/dashboard. The dashboard overview now lives at /merchant.
 */
export default function AdminDashboardRedirect() {
  redirect('/merchant');
}
