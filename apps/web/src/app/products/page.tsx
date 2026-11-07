import { Container } from '@/components/ui';
import { CatalogBrowser } from '@/features/catalog';

export const metadata = {
  title: 'Shop — Shopkart',
};

export default function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  return (
    <Container className="py-8 sm:py-12">
      <CatalogBrowser categoryParam={searchParams?.category ?? null} />
    </Container>
  );
}
