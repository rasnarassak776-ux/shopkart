'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';
import { ToastContainer, type ToastMessage, type ToastType } from '@/components/ui';
import {
  getActiveCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  clearCart as apiClearCart,
} from './cart-api';
import type { Cart, CartItem } from './types';

export const EMPTY_CART: Cart = {
  cartId: null,
  items: [],
  summary: {
    totalItems: 0,
    availableItems: 0,
    subtotal: '0.00',
  },
};

export interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  updatingItemIds: Set<string>;
  totalItems: number;
  availableItems: number;
  subtotal: string;
  hasUnavailableItems: boolean;
  isEmpty: boolean;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>;
  updateItem: (itemId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  removeItem: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<{ success: boolean; error?: string }>;
  showToast: (message: string, type?: ToastType, title?: string) => void;
  dismissToast: (id: string) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Track user and sequence to guard against stale responses & user switches
  const previousUserIdRef = useRef<string | null>(null);
  const requestSeqRef = useRef<number>(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch cart from backend
  const fetchCart = useCallback(async (isInitial = false) => {
    if (!isAuthenticated || !user) {
      setCart(EMPTY_CART);
      setIsLoading(false);
      return;
    }

    const currentSeq = ++requestSeqRef.current;
    if (isInitial) setIsLoading(true);
    setError(null);

    try {
      const data = await getActiveCart();
      if (currentSeq === requestSeqRef.current) {
        setCart(data);
        setError(null);
      }
    } catch (err: any) {
      if (currentSeq === requestSeqRef.current) {
        if (err instanceof ApiError && err.status === 401) {
          // Unauthenticated or expired session
          setCart(EMPTY_CART);
        } else {
          const msg = err instanceof ApiError ? err.message : 'Unable to load shopping cart.';
          setError(msg);
        }
      }
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user]);

  // Synchronize cart with authentication lifecycle
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id || null;

    // User logged out or switched accounts -> reset immediately
    if (previousUserIdRef.current !== currentUserId) {
      setCart(EMPTY_CART);
      setError(null);
      setUpdatingItemIds(new Set());
      previousUserIdRef.current = currentUserId;
    }

    if (isAuthenticated && currentUserId) {
      fetchCart(true);
    } else {
      setCart(EMPTY_CART);
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, user?.id, fetchCart]);

  // Refresh cart wrapper
  const refreshCart = useCallback(async () => {
    await fetchCart(false);
  }, [fetchCart]);

  // Add product to cart
  const addItem = useCallback(
    async (productId: string, quantity = 1): Promise<{ success: boolean; error?: string }> => {
      if (!isAuthenticated) {
        return { success: false, error: 'LOGIN_REQUIRED' };
      }

      setIsUpdating(true);
      setError(null);

      try {
        const updated = await apiAddToCart({ productId, quantity });
        setCart(updated);
        showToast('Item added to your cart!', 'success');
        return { success: true };
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : 'Failed to add item to cart.';
        showToast(msg, 'error');
        return { success: false, error: msg };
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, showToast],
  );

  // Update item quantity
  const updateItem = useCallback(
    async (itemId: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
      if (quantity < 1 || quantity > 99) {
        const msg = 'Quantity must be between 1 and 99.';
        showToast(msg, 'error');
        return { success: false, error: msg };
      }

      setUpdatingItemIds((prev) => new Set(prev).add(itemId));
      setError(null);

      try {
        const updated = await apiUpdateCartItem(itemId, { quantity });
        setCart(updated);
        return { success: true };
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : 'Failed to update item quantity.';
        showToast(msg, 'error');
        // Refresh cart to ensure UI matches backend state
        await refreshCart();
        return { success: false, error: msg };
      } finally {
        setUpdatingItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [refreshCart, showToast],
  );

  // Remove individual item
  const removeItem = useCallback(
    async (itemId: string): Promise<{ success: boolean; error?: string }> => {
      setUpdatingItemIds((prev) => new Set(prev).add(itemId));
      setError(null);

      try {
        const updated = await apiRemoveCartItem(itemId);
        setCart(updated);
        showToast('Item removed from your cart.', 'info');
        return { success: true };
      } catch (err: any) {
        const msg = err instanceof ApiError ? err.message : 'Failed to remove item from cart.';
        showToast(msg, 'error');
        await refreshCart();
        return { success: false, error: msg };
      } finally {
        setUpdatingItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    },
    [refreshCart, showToast],
  );

  // Clear entire cart
  const clearCart = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setIsUpdating(true);
    setError(null);

    try {
      const updated = await apiClearCart();
      setCart(updated);
      showToast('Shopping cart cleared.', 'info');
      return { success: true };
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to clear cart.';
      showToast(msg, 'error');
      await refreshCart();
      return { success: false, error: msg };
    } finally {
      setIsUpdating(false);
    }
  }, [refreshCart, showToast]);

  const totalItems = cart?.summary?.totalItems ?? 0;
  const availableItems = cart?.summary?.availableItems ?? 0;
  const subtotal = cart?.summary?.subtotal ?? '0.00';
  const hasUnavailableItems = useMemo(
    () => Boolean(cart?.items?.some((i) => !i.available)),
    [cart?.items],
  );
  const isEmpty = !cart || cart.items.length === 0;

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      isUpdating,
      error,
      updatingItemIds,
      totalItems,
      availableItems,
      subtotal,
      hasUnavailableItems,
      isEmpty,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      showToast,
      dismissToast,
    }),
    [
      cart,
      isLoading,
      isUpdating,
      error,
      updatingItemIds,
      totalItems,
      availableItems,
      subtotal,
      hasUnavailableItems,
      isEmpty,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      showToast,
      dismissToast,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
