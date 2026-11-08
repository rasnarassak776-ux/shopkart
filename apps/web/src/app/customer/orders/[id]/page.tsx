import { Metadata } from 'next';
import { ProtectedRoute } from '@/components/protected-route';
import { Container } from '@/components/ui';
import { OrderDetails } from '@/features/orders';

export const metadata: Metadata = {
  title: 'Order Details | Shopkart',
  description: 'View order details and status lifecycle tracking on Shopkart.',
};

interface CustomerOrderDetailsPageProps {
  params: {
    id: string;
  };
}

export default function CustomerOrderDetailsPage({
  params,
}: CustomerOrderDetailsPageProps) {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-canvas py-6 sm:py-10">
        <Container>
          <div className="max-w-5xl mx-auto">
            <OrderDetails orderId={params.id} />
          </div>
        </Container>
      </main>
    </ProtectedRoute>
  );
}
