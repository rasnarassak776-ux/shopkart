import { Suspense } from 'react';
import { ProductEditor } from '@/features/admin';

export default function AdminNewProductPage() {
  return (
    <Suspense>
      <ProductEditor />
    </Suspense>
  );
}
