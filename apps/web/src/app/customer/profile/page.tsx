import { ProtectedRoute } from '@/components/protected-route';
import { ProfileView } from '@/features/users';
import { CUSTOMER_ROLES } from '@/lib/roles';

export default function CustomerProfilePage() {
  return (
    <ProtectedRoute allowedRoles={CUSTOMER_ROLES}>
      <ProfileView />
    </ProtectedRoute>
  );
}
