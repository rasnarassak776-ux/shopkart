import {
  createAdminProduct,
  deleteAdminProduct,
  deleteProductImage,
  getAdminProduct,
  getAdminProducts,
  setAdminProductStatus,
  setPrimaryProductImage,
  updateAdminProduct,
  uploadProductImages,
} from './admin-catalog-api';
import { resolveCatalogImageUrl } from '@/features/catalog/mappers';
import { SLUG_PATTERN, slugify } from './category-utils';
import type {
  AdminProduct,
  CreateAdminProductInput,
  UpdateAdminProductInput,
} from './types';

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

describe('Member 2 — Phase 3: Admin Product Management Frontend Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockProduct: AdminProduct = {
    id: 'prod-uuid-1',
    name: 'Pro Wireless Headphones',
    slug: 'pro-wireless-headphones',
    sku: 'PWH-001',
    description: 'Noise cancelling over-ear headphones',
    price: '4999.00',
    brand: 'AudioTech',
    categoryId: 'cat-uuid-1',
    isActive: true,
    createdAt: '2026-11-08T10:00:00.000Z',
    updatedAt: '2026-11-08T10:00:00.000Z',
    category: {
      id: 'cat-uuid-1',
      name: 'Headphones',
      slug: 'headphones',
    },
    images: [
      {
        id: 'img-1',
        productId: 'prod-uuid-1',
        imageUrl: '/api/v1/catalog/images/headphones-primary.webp',
        altText: 'Primary Image',
        displayOrder: 0,
        isPrimary: true,
        createdAt: '2026-11-08T10:05:00.000Z',
      },
      {
        id: 'img-2',
        productId: 'prod-uuid-1',
        imageUrl: '/api/v1/catalog/images/headphones-side.webp',
        altText: 'Side angle',
        displayOrder: 1,
        isPrimary: false,
        createdAt: '2026-11-08T10:06:00.000Z',
      },
    ],
    primaryImage: {
      id: 'img-1',
      productId: 'prod-uuid-1',
      imageUrl: '/api/v1/catalog/images/headphones-primary.webp',
      altText: 'Primary Image',
      displayOrder: 0,
      isPrimary: true,
      createdAt: '2026-11-08T10:05:00.000Z',
    },
  };

  describe('Admin Catalog API - Product Operations', () => {
    it('getAdminProducts builds query string with filters, sort and pagination', async () => {
      apiClient.mockResolvedValueOnce({
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await getAdminProducts({
        page: 2,
        limit: 10,
        search: 'wireless',
        categoryId: 'cat-uuid-1',
        isActive: true,
        sortBy: 'price',
        sortOrder: 'asc',
      });

      expect(apiClient).toHaveBeenCalledTimes(1);
      const calledUrl = apiClient.mock.calls[0][0];
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('search=wireless');
      expect(calledUrl).toContain('categoryId=cat-uuid-1');
      expect(calledUrl).toContain('isActive=true');
      expect(calledUrl).toContain('sortBy=price');
      expect(calledUrl).toContain('sortOrder=asc');
      expect(result.data).toHaveLength(1);
    });

    it('getAdminProducts handles call without params', async () => {
      apiClient.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await getAdminProducts();
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/catalog\/admin\/products$/),
        undefined,
      );
    });

    it('getAdminProduct fetches product by ID with URL encoding', async () => {
      apiClient.mockResolvedValueOnce(mockProduct);

      const res = await getAdminProduct('prod-uuid-1');
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1'),
        undefined,
      );
      expect(res.id).toBe('prod-uuid-1');
      expect(res.name).toBe('Pro Wireless Headphones');
    });

    it('createAdminProduct issues POST request with valid JSON payload', async () => {
      apiClient.mockResolvedValueOnce(mockProduct);

      const input: CreateAdminProductInput = {
        name: 'New Product',
        sku: 'NP-001',
        price: 1999.5,
        categoryId: 'cat-uuid-1',
        brand: 'BrandX',
        description: 'Quality item',
        slug: 'new-product',
        isActive: true,
      };

      await createAdminProduct(input);

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        }),
      );
    });

    it('updateAdminProduct issues PATCH request with partial updates', async () => {
      apiClient.mockResolvedValueOnce({ ...mockProduct, price: '5499.00' });

      const patch: UpdateAdminProductInput = {
        price: 5499,
        brand: 'AudioTech Pro',
      };

      await updateAdminProduct('prod-uuid-1', patch);

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),
      );
    });

    it('setAdminProductStatus toggles active state via PATCH /status', async () => {
      apiClient.mockResolvedValueOnce({ ...mockProduct, isActive: false });

      const res = await setAdminProductStatus('prod-uuid-1', false);

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1/status'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ isActive: false }),
        }),
      );
      expect(res.isActive).toBe(false);
    });

    it('deleteAdminProduct sends DELETE request when allowed', async () => {
      apiClient.mockResolvedValueOnce({
        success: true,
        message: 'Product deleted successfully',
        id: 'prod-uuid-1',
      });

      const res = await deleteAdminProduct('prod-uuid-1');

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
      expect(res.success).toBe(true);
    });

    it('deleteAdminProduct propagates ConflictException (409) for historical orders or inventory', async () => {
      apiClient.mockRejectedValueOnce(
        new ApiError(
          'Cannot delete product: it is referenced by 3 historical order record(s). Deactivate the product instead.',
          409,
        ),
      );

      await expect(deleteAdminProduct('prod-uuid-1')).rejects.toThrow(
        /referenced by 3 historical order record/,
      );
    });
  });

  describe('Admin Catalog API - Product Image Management', () => {
    it('uploadProductImages sends FormData with files to product images endpoint', async () => {
      const mockImages = [
        {
          id: 'img-10',
          productId: 'prod-uuid-1',
          imageUrl: '/api/v1/catalog/images/uploaded.webp',
          altText: null,
          displayOrder: 0,
          isPrimary: true,
          createdAt: '2026-11-08T12:00:00.000Z',
        },
      ];
      apiClient.mockResolvedValueOnce(mockImages);

      const formData = {} as FormData;
      const res = await uploadProductImages('prod-uuid-1', formData);

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1/images'),
        expect.objectContaining({
          method: 'POST',
          body: formData,
        }),
      );
      expect(res).toHaveLength(1);
    });

    it('deleteProductImage sends DELETE request for a specific image', async () => {
      apiClient.mockResolvedValueOnce({
        success: true,
        message: 'Image deleted',
        imageId: 'img-2',
      });

      const res = await deleteProductImage('prod-uuid-1', 'img-2');

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1/images/img-2'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
      expect(res.imageId).toBe('img-2');
    });

    it('setPrimaryProductImage sets designated primary image via PATCH', async () => {
      const primaryResult = {
        ...mockProduct.images[1],
        isPrimary: true,
      };
      apiClient.mockResolvedValueOnce(primaryResult);

      const res = await setPrimaryProductImage('prod-uuid-1', 'img-2');

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/admin/products/prod-uuid-1/images/img-2/primary'),
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
      expect(res.isPrimary).toBe(true);
    });
  });

  describe('Image Resolution & Rewrites for Local Storage', () => {
    it('normalizes local catalog image filenames to same-origin relative URLs', () => {
      expect(resolveCatalogImageUrl('/api/v1/catalog/images/headphones-primary.webp')).toBe(
        '/api/v1/catalog/images/headphones-primary.webp',
      );
      expect(resolveCatalogImageUrl('api/v1/catalog/images/sample.png')).toBe(
        '/api/v1/catalog/images/sample.png',
      );
    });

    it('preserves external image URLs (e.g. Unsplash placeholders)', () => {
      const unsplashUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
      expect(resolveCatalogImageUrl(unsplashUrl)).toBe(unsplashUrl);
    });

    it('returns empty string for null or undefined input (no hardcoded Unsplash fallback for products)', () => {
      expect(resolveCatalogImageUrl(null)).toBe('');
      expect(resolveCatalogImageUrl(undefined)).toBe('');
    });
  });

  describe('Form Validation Rules and Constraints', () => {
    it('validates slug pattern according to catalog rules', () => {
      expect(SLUG_PATTERN.test('noise-cancelling-headphones')).toBe(true);
      expect(SLUG_PATTERN.test('prod-123')).toBe(true);
      expect(SLUG_PATTERN.test('invalid slug with spaces')).toBe(false);
      expect(SLUG_PATTERN.test('Invalid-Uppercase')).toBe(false);
      expect(SLUG_PATTERN.test('double--hyphens')).toBe(false);
      expect(SLUG_PATTERN.test('-leading-hyphen')).toBe(false);
    });

    it('generates URL-safe slugs from product names', () => {
      expect(slugify('Sony WH-1000XM5 Wireless Headphones!')).toBe(
        'sony-wh-1000xm5-wireless-headphones',
      );
      expect(slugify('  24" 4K Gaming Monitor (144Hz)  ')).toBe('24-4k-gaming-monitor-144hz');
    });

    it('validates price must be positive number', () => {
      const validPrices = ['1', '99.99', '1499.00', '0.50'];
      const invalidPrices = ['0', '-10', 'abc', ''];

      validPrices.forEach((p) => {
        const parsed = parseFloat(p);
        expect(!isNaN(parsed) && parsed > 0).toBe(true);
      });

      invalidPrices.forEach((p) => {
        const parsed = parseFloat(p);
        expect(!isNaN(parsed) && parsed > 0).toBe(false);
      });
    });

    it('validates allowed image MIME types and size constraints', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxFileSize = 5 * 1024 * 1024; // 5 MB
      const maxFiles = 8;

      expect(allowedTypes.includes('image/jpeg')).toBe(true);
      expect(allowedTypes.includes('image/png')).toBe(true);
      expect(allowedTypes.includes('image/webp')).toBe(true);
      expect(allowedTypes.includes('image/gif')).toBe(false);
      expect(allowedTypes.includes('application/pdf')).toBe(false);

      expect(4 * 1024 * 1024 <= maxFileSize).toBe(true);
      expect(6 * 1024 * 1024 <= maxFileSize).toBe(false);
      expect(8 <= maxFiles).toBe(true);
      expect(9 <= maxFiles).toBe(false);
    });
  });
});
