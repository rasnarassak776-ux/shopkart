import { Suspense } from 'react';
import { ProductEditor } from '@/features/admin';

export default function AdminEditProductPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Suspense>
      <ProductEditor productId={params.id} />
    </Suspense>
  );
}
