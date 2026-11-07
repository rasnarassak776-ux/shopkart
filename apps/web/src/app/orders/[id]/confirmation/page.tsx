import { Metadata } from 'next';
import { OrderConfirmation } from '@/features/orders';

export const metadata: Metadata = {
  title: 'Order Confirmation | Shopkart',
  description: 'Your Shopkart order has been confirmed.',
};

interface OrderConfirmationPageProps {
  params: {
    id: string;
  };
}

export default function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  return <OrderConfirmation orderId={params.id} />;
}
