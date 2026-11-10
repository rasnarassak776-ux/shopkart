import { AdminAccountDetails } from '@/features/superadmin';

export default function SuperadminAdminDetailsPage({ params }: { params: { id: string } }) {
  return <AdminAccountDetails adminId={params.id} />;
}
