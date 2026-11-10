import { ProtectedRoute } from '@/components/protected-route';
import { AddressManager } from '@/features/addresses';
import { CUSTOMER_ROLES } from '@/lib/roles';

export default function CustomerAddressesPage() {
  return (
    <ProtectedRoute allowedRoles={CUSTOMER_ROLES}>
      <AddressManager />
    </ProtectedRoute>
  );
}
