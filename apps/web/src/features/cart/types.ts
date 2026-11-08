/**
 * Cart domain types and response contracts for Cart Service (port 3030).
 */

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  available: boolean;
}

export interface CartSummaryData {
  totalItems: number;
  availableItems: number;
  subtotal: string;
}

export interface Cart {
  cartId: string | null;
  items: CartItem[];
  summary: CartSummaryData;
}

export interface AddToCartDto {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}
