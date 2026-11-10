import { Suspense } from 'react';
import { ProductManager } from '@/features/admin';

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductManager />
    </Suspense>
  );
}
