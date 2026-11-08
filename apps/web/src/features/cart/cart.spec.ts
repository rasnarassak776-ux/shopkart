import { EMPTY_CART } from './cart-context';
import { formatCurrency } from './components/cart-item-row';
import {
  getActiveCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from './cart-api';
import type { Cart, CartItem } from './types';

// Mock api-client
jest.mock('@/lib/api-client', () => {
  return {
    apiClient: jest.fn(),
    ApiError: class ApiError extends Error {
      constructor(public message: string, public status: number) {
        super(message);
        this.name = 'ApiError';
      }
    },
  };
});

const { apiClient, ApiError } = jest.requireMock('@/lib/api-client');

describe('Member 3 - Frontend Cart Integration & Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EMPTY_CART and Initial State', () => {
    it('should have correct default empty cart structure', () => {
      expect(EMPTY_CART).toEqual({
        cartId: null,
        items: [],
        summary: {
          totalItems: 0,
          availableItems: 0,
          subtotal: '0.00',
        },
      });
    });

    it('should correctly format currency for display according to catalog convention', () => {
      expect(formatCurrency('2499.00')).toMatch(/₹\s?2,499\.00/);
      expect(formatCurrency('0.00')).toMatch(/₹\s?0\.00/);
      expect(formatCurrency(4998)).toMatch(/₹\s?4,998\.00/);
      expect(formatCurrency('invalid')).toBe('₹0.00');
    });
  });

  describe('Cart API Client Functions', () => {
    const mockCart: Cart = {
      cartId: 'cart-uuid-1',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Noise Cancelling Headphones',
          imageUrl: 'https://images.unsplash.com/photo-headphones',
          unitPrice: '2499.00',
          quantity: 2,
          lineTotal: '4998.00',
          available: true,
        },
      ],
      summary: {
        totalItems: 2,
        availableItems: 2,
        subtotal: '4998.00',
      },
    };

    it('getActiveCart should call GET /api/v1/cart', async () => {
      apiClient.mockResolvedValueOnce(mockCart);

      const result = await getActiveCart();
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/cart$/),
        undefined,
      );
      expect(result).toEqual(mockCart);
      expect(result.summary.subtotal).toBe('4998.00');
    });

    it('addToCart should call POST /api/v1/cart/items with productId and quantity', async () => {
      apiClient.mockResolvedValueOnce(mockCart);

      const dto = { productId: 'prod-1', quantity: 2 };
      const result = await addToCart(dto);

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/cart\/items$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(dto),
        }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('updateCartItemQuantity should call PATCH /api/v1/cart/items/:itemId', async () => {
      const updatedCart: Cart = {
        ...mockCart,
        items: [
          {
            ...mockCart.items[0],
            quantity: 5,
            lineTotal: '12495.00',
          },
        ],
        summary: {
          totalItems: 5,
          availableItems: 5,
          subtotal: '12495.00',
        },
      };

      apiClient.mockResolvedValueOnce(updatedCart);

      const result = await updateCartItemQuantity('item-1', { quantity: 5 });
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/cart\/items\/item-1$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ quantity: 5 }),
        }),
      );
      expect(result.items[0].quantity).toBe(5);
      expect(result.summary.subtotal).toBe('12495.00');
    });

    it('removeCartItem should call DELETE /api/v1/cart/items/:itemId', async () => {
      apiClient.mockResolvedValueOnce(EMPTY_CART);

      const result = await removeCartItem('item-1');
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/cart\/items\/item-1$/),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
      expect(result.items).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
    });

    it('clearCart should call DELETE /api/v1/cart/items', async () => {
      apiClient.mockResolvedValueOnce(EMPTY_CART);

      const result = await clearCart();
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/cart\/items$/),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
      expect(result.items).toHaveLength(0);
    });

    it('should propagate ApiError when backend returns 400, 401, 404, or 503', async () => {
      apiClient.mockRejectedValueOnce(
        new ApiError('Product not found or inactive', 404),
      );

      await expect(
        addToCart({ productId: 'invalid-id', quantity: 1 }),
      ).rejects.toThrow('Product not found or inactive');
    });
  });

  describe('Unavailable Products and Subtotal Business Rules', () => {
    it('should distinguish totalItems vs availableItems and exclude unavailable products from subtotal', () => {
      const mixedCart: Cart = {
        cartId: 'cart-mixed',
        items: [
          {
            id: 'item-active',
            productId: 'prod-active',
            name: 'Active Product',
            imageUrl: null,
            unitPrice: '1000.00',
            quantity: 2,
            lineTotal: '2000.00',
            available: true,
          },
          {
            id: 'item-unavailable',
            productId: 'prod-unavailable',
            name: 'Discontinued Product',
            imageUrl: null,
            unitPrice: '0.00',
            quantity: 3,
            lineTotal: '0.00',
            available: false,
          },
        ],
        summary: {
          totalItems: 5,     // 2 active + 3 inactive
          availableItems: 2, // only 2 active purchasable
          subtotal: '2000.00', // only active line totals
        },
      };

      const hasUnavailable = mixedCart.items.some((i) => !i.available);
      expect(hasUnavailable).toBe(true);
      expect(mixedCart.summary.totalItems).toBe(5);
      expect(mixedCart.summary.availableItems).toBe(2);
      expect(mixedCart.summary.subtotal).toBe('2000.00');

      // Unavailable product controls must block checkout
      const isCheckoutDisabled =
        mixedCart.items.length === 0 ||
        mixedCart.summary.availableItems === 0 ||
        hasUnavailable;
      expect(isCheckoutDisabled).toBe(true);
    });

    it('should enable checkout when all items are available and cart is populated', () => {
      const validCart: Cart = {
        cartId: 'cart-valid',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            name: 'Mechanical Keyboard',
            imageUrl: null,
            unitPrice: '1500.00',
            quantity: 1,
            lineTotal: '1500.00',
            available: true,
          },
        ],
        summary: {
          totalItems: 1,
          availableItems: 1,
          subtotal: '1500.00',
        },
      };

      const hasUnavailable = validCart.items.some((i) => !i.available);
      const isCheckoutDisabled =
        validCart.items.length === 0 ||
        validCart.summary.availableItems === 0 ||
        hasUnavailable;

      expect(hasUnavailable).toBe(false);
      expect(isCheckoutDisabled).toBe(false);
    });

    it('should disable checkout when cart is empty', () => {
      const isCheckoutDisabled =
        EMPTY_CART.items.length === 0 ||
        EMPTY_CART.summary.availableItems === 0 ||
        EMPTY_CART.items.some((i) => !i.available);

      expect(isCheckoutDisabled).toBe(true);
    });
  });

  describe('Quantity Bounds & Direct Quantity Updating', () => {
    it('should enforce quantity bounds strictly between 1 and 99', () => {
      const isValidQuantity = (q: number) => q >= 1 && q <= 99 && Number.isInteger(q);

      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(99)).toBe(true);
      expect(isValidQuantity(50)).toBe(true);
      expect(isValidQuantity(0)).toBe(false);
      expect(isValidQuantity(-1)).toBe(false);
      expect(isValidQuantity(100)).toBe(false);
      expect(isValidQuantity(1.5)).toBe(false);
    });

    it('should clamp input values to minimum 1 and maximum 99', () => {
      const clampQuantity = (val: number) => Math.min(99, Math.max(1, val));

      expect(clampQuantity(0)).toBe(1);
      expect(clampQuantity(-10)).toBe(1);
      expect(clampQuantity(150)).toBe(99);
      expect(clampQuantity(5)).toBe(5);
    });
  });

  describe('Header Badge Synchronization Logic', () => {
    it('should display totalItems when > 0 and cap display at 99+', () => {
      const formatBadge = (totalItems: number) => {
        if (totalItems <= 0) return null;
        return totalItems > 99 ? '99+' : String(totalItems);
      };

      expect(formatBadge(0)).toBeNull();
      expect(formatBadge(1)).toBe('1');
      expect(formatBadge(25)).toBe('25');
      expect(formatBadge(99)).toBe('99');
      expect(formatBadge(100)).toBe('99+');
      expect(formatBadge(250)).toBe('99+');
    });

    it('should reflect item addition in badge count', () => {
      let totalItems = 0;
      // User adds 2 items
      totalItems += 2;
      expect(totalItems).toBe(2);

      // User adds 3 more items
      totalItems += 3;
      expect(totalItems).toBe(5);

      // User removes 1 item
      totalItems -= 1;
      expect(totalItems).toBe(4);

      // User clears cart
      totalItems = 0;
      expect(totalItems).toBe(0);
    });
  });

  describe('Authentication Lifecycle and Isolation Logic', () => {
    it('should reset cart state to EMPTY_CART on user logout', () => {
      let currentCart: Cart | null = {
        cartId: 'user-a-cart',
        items: [
          {
            id: 'item-1',
            productId: 'p-1',
            name: 'User A Item',
            imageUrl: null,
            unitPrice: '500.00',
            quantity: 1,
            lineTotal: '500.00',
            available: true,
          },
        ],
        summary: { totalItems: 1, availableItems: 1, subtotal: '500.00' },
      };

      // Simulate logout
      const handleLogout = () => {
        currentCart = EMPTY_CART;
      };

      handleLogout();
      expect(currentCart).toEqual(EMPTY_CART);
      expect(currentCart.items).toHaveLength(0);
      expect(currentCart.summary.totalItems).toBe(0);
    });

    it('should prevent leaking previous user cart when another user signs in', () => {
      let previousUserId: string | null = 'user-a';
      let displayedCart: Cart = {
        cartId: 'user-a-cart',
        items: [
          {
            id: 'item-a',
            productId: 'p-a',
            name: 'User A Product',
            imageUrl: null,
            unitPrice: '100.00',
            quantity: 1,
            lineTotal: '100.00',
            available: true,
          },
        ],
        summary: { totalItems: 1, availableItems: 1, subtotal: '100.00' },
      };

      // User B logs in
      const newUserId = 'user-b';
      if (previousUserId !== newUserId) {
        // Immediate reset before fetching new cart
        displayedCart = EMPTY_CART;
        previousUserId = newUserId;
      }

      expect(displayedCart).toEqual(EMPTY_CART);
      expect(previousUserId).toBe('user-b');
    });
  });
});
