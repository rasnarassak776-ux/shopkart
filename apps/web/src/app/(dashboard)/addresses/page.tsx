import { ProtectedRoute } from '@/components/protected-route';
import { AddressManager } from '@/features/addresses';
import { CUSTOMER_ROLES } from '@/lib/roles';

export default function AddressesPage() {
  return (
    <ProtectedRoute allowedRoles={CUSTOMER_ROLES}>
      <AddressManager />
    </ProtectedRoute>
  );
}
