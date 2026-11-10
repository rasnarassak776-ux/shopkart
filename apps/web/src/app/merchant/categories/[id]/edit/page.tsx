import { CategoryEditor } from '@/features/admin';

export default function AdminEditCategoryPage({ params }: { params: { id: string } }) {
  return <CategoryEditor categoryId={params.id} />;
}
