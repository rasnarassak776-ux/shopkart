import { MerchantAccountDetails } from '@/features/superadmin';

export default function SuperadminAdminDetailsPage({ params }: { params: { id: string } }) {
  return <MerchantAccountDetails merchantId={params.id} />;
}
