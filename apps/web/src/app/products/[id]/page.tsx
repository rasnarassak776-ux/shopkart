import { Container } from '@/components/ui';
import { ProductDetailsView } from '@/features/product-details';

export const metadata = {
  title: 'Product — Shopkart',
};

export default function ProductDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Container className="py-8 sm:py-12">
      <ProductDetailsView productId={params.id} />
    </Container>
  );
}
