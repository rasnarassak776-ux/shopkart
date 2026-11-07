import { Metadata } from 'next';
import { OrderConfirmation } from '@/features/orders';

export const metadata: Metadata = {
  title: 'Order Details | Shopkart',
  description: 'View your order details on Shopkart.',
};

interface OrderDetailsPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  return <OrderConfirmation orderId={params.id} />;
}
