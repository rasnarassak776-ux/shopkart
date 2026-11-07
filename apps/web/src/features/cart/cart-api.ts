import { apiClient } from '@/lib/api-client';
import type { AddToCartDto, Cart, UpdateCartItemDto } from './types';

const CART_API_URL = (
  process.env.NEXT_PUBLIC_CART_API_URL || 'http://localhost:3030'
).replace(/\/$/, '');

/**
 * Fetch the authenticated customer's active shopping cart.
 */
export async function getActiveCart(init?: RequestInit): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart`, init);
}

export const getCart = getActiveCart;

/**
 * Add an item to the shopping cart.
 */
export async function addToCart(
  dto: AddToCartDto,
  init?: RequestInit,
): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart/items`, {
    ...init,
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Update the quantity of an existing item in the cart.
 */
export async function updateCartItemQuantity(
  itemId: string,
  dto: UpdateCartItemDto,
  init?: RequestInit,
): Promise<Cart> {
  return apiClient<Cart>(
    `${CART_API_URL}/api/v1/cart/items/${encodeURIComponent(itemId)}`,
    {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(dto),
    },
  );
}

export const updateCartItem = updateCartItemQuantity;

/**
 * Remove an item from the shopping cart.
 */
export async function removeCartItem(
  itemId: string,
  init?: RequestInit,
): Promise<Cart> {
  return apiClient<Cart>(
    `${CART_API_URL}/api/v1/cart/items/${encodeURIComponent(itemId)}`,
    {
      ...init,
      method: 'DELETE',
    },
  );
}

/**
 * Clear all items from the active shopping cart.
 */
export async function clearCart(init?: RequestInit): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart/items`, {
    ...init,
    method: 'DELETE',
  });
}
