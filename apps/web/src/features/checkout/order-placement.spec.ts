/**
 * Member 3 – Phase 5: Order Placement and Confirmation Logic Tests
 */
import { formatCurrency, formatDate } from '../orders/components/order-confirmation';
import { placeOrder } from './checkout-api';
import * as apiClientModule from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: jest.fn(),
  getAccessToken: jest.fn(() => 'mock-token-xyz'),
}));

describe('Member 3 – Phase 5: Order Placement & Confirmation Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Currency & Date Formatting in Order Confirmation', () => {
    it('should format order totals in INR with rupee symbol and paise', () => {
      expect(formatCurrency('1299.99')).toMatch(/₹\s?1,299\.99/);
      expect(formatCurrency(5000)).toMatch(/₹\s?5,000\.00/);
      expect(formatCurrency('0.00')).toMatch(/₹\s?0\.00/);
    });

    it('should handle invalid currency amounts gracefully', () => {
      expect(formatCurrency('invalid-amount')).toBe('₹0.00');
    });

    it('should format valid ISO date strings into readable localized format', () => {
      const formatted = formatDate('2026-11-08T10:30:00Z');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
      // Should include month, year or time
      expect(formatted).toMatch(/2026|Nov/);
    });
  });

  describe('2. Order Placement API Client (COD Flow)', () => {
    it('should propagate Idempotency-Key in headers and format request payload', async () => {
      const mockBackendOrder = {
        id: 'order-uuid-999',
        status: 'PENDING',
        totalAmount: '1499.00',
        payment: {
          paymentMethod: 'COD',
          paymentStatus: 'COD_PENDING',
        },
        createdAt: '2026-11-08T10:30:00Z',
      };

      (apiClientModule.apiClient as jest.Mock).mockResolvedValue(mockBackendOrder);

      const response = await placeOrder({
        addressId: 'address-uuid-1',
        paymentMethod: 'COD',
        idempotencyKey: 'idemp-key-12345',
      });

      expect(apiClientModule.apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/orders'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Idempotency-Key': 'idemp-key-12345',
          }),
          body: JSON.stringify({
            addressId: 'address-uuid-1',
            paymentMethod: 'COD',
          }),
        }),
      );

      expect(response).toEqual({
        orderId: 'order-uuid-999',
        status: 'PENDING',
        totalAmount: '1499.00',
        paymentMethod: 'COD',
        paymentStatus: 'COD_PENDING',
        createdAt: '2026-11-08T10:30:00Z',
      });
    });

    it('should support legacy id field mapping in order response', async () => {
      const mockBackendOrder = {
        orderId: 'order-uuid-legacy',
        status: 'CONFIRMED',
        totalAmount: '899.00',
        paymentMethod: 'COD',
        createdAt: '2026-11-08T10:30:00Z',
      };

      (apiClientModule.apiClient as jest.Mock).mockResolvedValue(mockBackendOrder);

      const response = await placeOrder({
        addressId: 'address-uuid-1',
        paymentMethod: 'COD',
        idempotencyKey: 'idemp-key-999',
      });

      expect(response.orderId).toBe('order-uuid-legacy');
      expect(response.status).toBe('CONFIRMED');
    });
  });
});
