import { Suspense } from 'react';
import { AdminAccountManager } from '@/features/superadmin';

export default function SuperadminAdminsPage() {
  return (
    <Suspense>
      <AdminAccountManager />
    </Suspense>
  );
}
