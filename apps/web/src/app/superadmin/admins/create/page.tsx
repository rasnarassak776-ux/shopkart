import { AdminPageHeader } from '@/components/admin';
import { AdminAccountForm } from '@/features/superadmin';

export default function SuperadminCreateAdminPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Create admin"
        description="Admins can manage the store catalog and orders. They cannot manage other admin accounts."
      />
      <AdminAccountForm />
    </div>
  );
}
