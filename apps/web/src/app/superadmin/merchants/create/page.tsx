import { AdminPageHeader } from '@/components/admin';
import { MerchantAccountForm } from '@/features/superadmin';

export default function SuperadminCreateAdminPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Create merchant"
        description="Merchants can manage the store catalog and orders. They cannot manage other merchant accounts."
      />
      <MerchantAccountForm />
    </div>
  );
}
