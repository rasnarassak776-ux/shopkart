import { ProtectedRoute } from '@/components/protected-route';
import { ProfileView } from '@/features/users';

export default function ProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['customer', 'admin']}>
      <ProfileView />
    </ProtectedRoute>
  );
}
