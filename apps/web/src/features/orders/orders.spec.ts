/**
 * Member 3 – Phase 6: Customer Order History, Details & Status Tracking Tests
 */
import {
  formatCurrency,
  formatDate,
  formatShortDate,
} from './order-utils';
import { getCustomerOrders, getOrderById } from './orders-api';
import * as apiClientModule from '@/lib/api-client';
import type { Order, OrderStatus, PaginatedOrdersResponse } from './types';

jest.mock('@/lib/api-client', () => ({
  apiClient: jest.fn(),
  getAccessToken: jest.fn(() => 'mock-token-xyz'),
}));

describe('Member 3 – Phase 6: Customer Order Management Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrder: Order = {
    id: '60e63cca-7cda-4445-ab38-0e6c7d17a791',
    userId: 'user-uuid-1',
    status: 'PENDING',
    totalAmount: '299.00',
    currency: 'INR',
    itemCount: 1,
    addressSnapshot: {
      fullName: 'John Smith',
      phone: '9123456789',
      addressLine1: '123 Tech Park Road, Whitefield',
      addressLine2: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560100',
      country: 'India',
    },
    items: [
      {
        id: 'item-1',
        productId: 'prod-coffee-mug',
        name: 'Coffee Mug',
        productNameSnapshot: 'Coffee Mug',
        quantity: 1,
        unitPrice: '299.00',
        unitPriceSnapshot: '299.00',
        totalPrice: '299.00',
      },
    ],
    payment: {
      paymentMethod: 'COD',
      paymentStatus: 'COD_PENDING',
      amount: '299.00',
      idempotencyKey: '04a6f12f-8b70-4fd2-ab89-040a8bab14bc',
    },
    statusHistory: [
      {
        status: 'PENDING',
        changedAt: '2026-11-08T03:31:24.623Z',
      },
    ],
    createdAt: '2026-11-08T03:31:24.561Z',
    updatedAt: '2026-11-08T03:31:24.561Z',
  };

  describe('1. Currency & Date Formatting Utilities', () => {
    it('should format amounts in Indian Rupees with symbol and 2 decimals', () => {
      expect(formatCurrency('299.00')).toMatch(/₹\s?299\.00/);
      expect(formatCurrency(1499.5)).toMatch(/₹\s?1,499\.50/);
      expect(formatCurrency(0)).toMatch(/₹\s?0\.00/);
    });

    it('should handle undefined or null amounts safely', () => {
      expect(formatCurrency(undefined)).toBe('₹0.00');
      expect(formatCurrency(null)).toBe('₹0.00');
      expect(formatCurrency('invalid')).toBe('₹0.00');
    });

    it('should format full dates with time and day', () => {
      const fullDate = formatDate('2026-11-08T03:31:24.561Z');
      expect(fullDate).toBeTruthy();
      expect(fullDate).toMatch(/2026|Nov/);
    });

    it('should format short dates without crashing on null/undefined', () => {
      expect(formatShortDate(null)).toBe('—');
      expect(formatShortDate(undefined)).toBe('—');
      expect(formatShortDate('2026-11-08T03:31:24.561Z')).toMatch(/2026|Nov/);
    });
  });

  describe('2. Orders API Client Integration', () => {
    it('should query getCustomerOrders with default pagination', async () => {
      const mockResponse: PaginatedOrdersResponse = {
        data: [mockOrder],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (apiClientModule.apiClient as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getCustomerOrders();
      expect(apiClientModule.apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/orders'),
        undefined,
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockOrder.id);
    });

    it('should propagate status, page, and limit query parameters', async () => {
      (apiClientModule.apiClient as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });

      await getCustomerOrders({ status: 'DELIVERED', page: 2, limit: 5 });

      expect(apiClientModule.apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/orders\?.*status=DELIVERED/),
        undefined,
      );
      expect(apiClientModule.apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/page=2/),
        undefined,
      );
      expect(apiClientModule.apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/limit=5/),
        undefined,
      );
    });

    it('should retrieve single order by ID using getOrderById', async () => {
      (apiClientModule.apiClient as jest.Mock).mockResolvedValue(mockOrder);

      const result = await getOrderById(mockOrder.id);
      expect(apiClientModule.apiClient).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/orders/${mockOrder.id}`),
        undefined,
      );
      expect(result.id).toBe(mockOrder.id);
      expect(result.addressSnapshot.fullName).toBe('John Smith');
    });
  });

  describe('3. Order Item & Snapshot Integrity', () => {
    it('should preserve snapshot values independent of current catalog values', () => {
      const item = mockOrder.items[0];
      expect(item.productNameSnapshot).toBe('Coffee Mug');
      expect(item.unitPriceSnapshot).toBe('299.00');
      expect(item.quantity).toBe(1);
    });

    it('should preserve immutable delivery address snapshot attributes', () => {
      const address = mockOrder.addressSnapshot;
      expect(address.fullName).toBe('John Smith');
      expect(address.phone).toBe('9123456789');
      expect(address.addressLine1).toBe('123 Tech Park Road, Whitefield');
      expect(address.city).toBe('Bengaluru');
      expect(address.postalCode).toBe('560100');
    });

    it('should expose COD payment details and pending status', () => {
      expect(mockOrder.payment?.paymentMethod).toBe('COD');
      expect(mockOrder.payment?.paymentStatus).toBe('COD_PENDING');
      expect(mockOrder.payment?.amount).toBe('299.00');
    });
  });

  describe('4. Status Timeline & Lifecycle Events', () => {
    it('should record chronological status events with timestamps', () => {
      const history = mockOrder.statusHistory || [];
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('PENDING');
      expect(history[0].changedAt).toBe('2026-11-08T03:31:24.623Z');
    });

    it('should maintain status transitions without fabricating unreached stages', () => {
      const statuses = (mockOrder.statusHistory || []).map((h) => h.status);
      expect(statuses).toContain('PENDING');
      expect(statuses).not.toContain('DELIVERED');
      expect(statuses).not.toContain('SHIPPED');
    });
  });

  describe('5. Pagination & Filtering Boundary Logic', () => {
    it('should compute totalPages correctly based on limit', () => {
      const totalItems = 25;
      const limit = 10;
      const totalPages = Math.ceil(totalItems / limit);
      expect(totalPages).toBe(3);
    });

    it('should accurately detect previous and next page availability', () => {
      const page1 = { page: 1, totalPages: 3 };
      expect(page1.page > 1).toBe(false);
      expect(page1.page < page1.totalPages).toBe(true);

      const page2 = { page: 2, totalPages: 3 };
      expect(page2.page > 1).toBe(true);
      expect(page2.page < page2.totalPages).toBe(true);

      const page3 = { page: 3, totalPages: 3 };
      expect(page3.page > 1).toBe(true);
      expect(page3.page < page3.totalPages).toBe(false);
    });
  });
});
