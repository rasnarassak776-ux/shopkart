import { ProtectedRoute } from '@/components/protected-route';
import { ProfileView } from '@/features/users';
import { ALL_ROLES } from '@/lib/roles';

export default function ProfilePage() {
  return (
    <ProtectedRoute allowedRoles={ALL_ROLES}>
      <ProfileView />
    </ProtectedRoute>
  );
}
