import { Suspense } from 'react';
import { CategoryManager } from '@/features/admin';

export default function AdminCategoriesPage() {
  return (
    <Suspense>
      <CategoryManager />
    </Suspense>
  );
}
