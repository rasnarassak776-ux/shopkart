import { ProtectedRoute } from '@/components/protected-route';
import { AddressManager } from '@/features/addresses';

export default function AddressesPage() {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <AddressManager />
    </ProtectedRoute>
  );
}
