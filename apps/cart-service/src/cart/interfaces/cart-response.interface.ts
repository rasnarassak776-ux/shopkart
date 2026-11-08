export interface CartItemResponse {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  available: boolean;
}

export interface CartSummaryResponse {
  totalItems: number;
  availableItems: number;
  subtotal: string;
}

export interface CartResponse {
  cartId: string | null;
  items: CartItemResponse[];
  summary: CartSummaryResponse;
}
