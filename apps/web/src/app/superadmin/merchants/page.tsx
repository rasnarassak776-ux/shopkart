import { Suspense } from 'react';
import { MerchantAccountManager } from '@/features/superadmin';

export default function SuperadminAdminsPage() {
  return (
    <Suspense>
      <MerchantAccountManager />
    </Suspense>
  );
}
