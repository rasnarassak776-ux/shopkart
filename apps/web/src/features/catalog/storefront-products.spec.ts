import {
  getCatalogBrands,
  getCatalogCategories,
  getCatalogProduct,
  getCatalogProductBySlug,
  getCatalogProducts,
} from './catalog-api';
import {
  resolveCatalogImageUrl,
  toCategorySummary,
  toProductSummary,
} from './mappers';
import { toProductDetails } from '@/features/product-details/mappers';
import { getStorefrontCatalog } from './storefront-data';
import type { CatalogCategory, CatalogProduct } from './types';

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

describe('Member 2 — Phase 4: Customer Storefront Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockActiveProduct: CatalogProduct = {
    id: '11111111-1111-4111-8111-111111111111',
    categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Sony Noise-Cancelling Headphones',
    slug: 'sony-noise-cancelling-headphones',
    sku: 'SONY-WH-001',
    description: 'Industry-leading noise cancelling Bluetooth headphones with mic',
    price: '19999.00',
    brand: 'Sony',
    isActive: true,
    createdAt: '2026-11-08T12:00:00.000Z',
    updatedAt: '2026-11-08T12:00:00.000Z',
    category: {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      name: 'Audio',
      slug: 'audio',
    },
    images: [
      {
        id: 'img-uuid-primary',
        productId: '11111111-1111-4111-8111-111111111111',
        imageUrl: '/api/v1/catalog/images/sony-headphones-front.webp',
        altText: 'Front view of Sony headphones',
        displayOrder: 0,
        isPrimary: true,
        createdAt: '2026-11-08T12:05:00.000Z',
      },
      {
        id: 'img-uuid-side',
        productId: '11111111-1111-4111-8111-111111111111',
        imageUrl: '/api/v1/catalog/images/sony-headphones-side.webp',
        altText: 'Side angle',
        displayOrder: 1,
        isPrimary: false,
        createdAt: '2026-11-08T12:06:00.000Z',
      },
    ],
  };

  const mockProductNoImages: CatalogProduct = {
    id: '22222222-2222-4222-8222-222222222222',
    categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Basic Audio Cable',
    slug: 'basic-audio-cable',
    sku: 'CABLE-001',
    description: '3.5mm auxiliary male to male audio cable',
    price: '299.00',
    brand: 'Generic',
    isActive: true,
    createdAt: '2026-11-08T13:00:00.000Z',
    updatedAt: '2026-11-08T13:00:00.000Z',
    category: {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      name: 'Audio',
      slug: 'audio',
    },
    images: [],
  };

  describe('1. Real Product Listing & Catalog API Querying', () => {
    it('retrieves real products from the catalog service with query parameters', async () => {
      apiClient.mockResolvedValueOnce({
        data: [mockActiveProduct],
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      });

      const response = await getCatalogProducts({
        page: 1,
        limit: 12,
        search: 'Sony',
        categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        brand: 'Sony',
        minPrice: 1000,
        maxPrice: 25000,
        sortBy: 'price',
        sortOrder: 'asc',
      });

      expect(apiClient).toHaveBeenCalledTimes(1);
      const url = apiClient.mock.calls[0][0];
      expect(url).toContain('/api/v1/catalog/products');
      expect(url).toContain('search=Sony');
      expect(url).toContain('categoryId=cccccccc-cccc-4ccc-8ccc-cccccccccccc');
      expect(url).toContain('brand=Sony');
      expect(url).toContain('minPrice=1000');
      expect(url).toContain('maxPrice=25000');
      expect(url).toContain('sortBy=price');
      expect(url).toContain('sortOrder=asc');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].name).toBe('Sony Noise-Cancelling Headphones');
    });

    it('maps real database products to storefront view model using slug link and primary image', () => {
      const summary = toProductSummary(mockActiveProduct);

      expect(summary.id).toBe(mockActiveProduct.id);
      expect(summary.name).toBe(mockActiveProduct.name);
      expect(summary.brand).toBe(mockActiveProduct.brand);
      expect(summary.price).toBe(19999);
      expect(summary.href).toBe('/products/sony-noise-cancelling-headphones');
      expect(summary.image.src).toBe('/api/v1/catalog/images/sony-headphones-front.webp');
      expect(summary.image.alt).toBe('Front view of Sony headphones');
    });

    it('falls back to UUID in href if product slug is null or empty', () => {
      const productNoSlug = { ...mockActiveProduct, slug: null };
      const summary = toProductSummary(productNoSlug);
      expect(summary.href).toBe(`/products/${mockActiveProduct.id}`);
    });
  });

  describe('2. Product Detail Retrieval (UUID and Slug Support)', () => {
    it('fetches product by UUID through the primary :id endpoint', async () => {
      apiClient.mockResolvedValueOnce(mockActiveProduct);

      const product = await getCatalogProduct('11111111-1111-4111-8111-111111111111');

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/catalog\/products\/11111111-1111-4111-8111-111111111111$/),
        undefined,
      );
      expect(product.id).toBe(mockActiveProduct.id);
    });

    it('fetches product by slug through the slug/:slug endpoint when identifier is not a UUID', async () => {
      apiClient.mockResolvedValueOnce(mockActiveProduct);

      const product = await getCatalogProduct('sony-noise-cancelling-headphones');

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/catalog\/products\/slug\/sony-noise-cancelling-headphones$/),
        undefined,
      );
      expect(product.name).toBe(mockActiveProduct.name);
    });

    it('getCatalogProductBySlug explicitly routes to the slug endpoint', async () => {
      apiClient.mockResolvedValueOnce(mockActiveProduct);

      await getCatalogProductBySlug('sony-noise-cancelling-headphones');

      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/products/slug/sony-noise-cancelling-headphones'),
        undefined,
      );
    });

    it('toProductDetails correctly formats product details view model with all real fields', () => {
      const details = toProductDetails(mockActiveProduct);

      expect(details.id).toBe(mockActiveProduct.id);
      expect(details.name).toBe(mockActiveProduct.name);
      expect(details.brand).toBe('Sony');
      expect(details.price).toBe(19999);
      expect(details.sku).toBe('SONY-WH-001');
      expect(details.description).toBe(mockActiveProduct.description);
      expect(details.category.name).toBe('Audio');
      expect(details.category.href).toBe('/products?category=audio');
      expect(details.images).toHaveLength(2);
      expect(details.images[0].src).toBe('/api/v1/catalog/images/sony-headphones-front.webp');
      expect(details.images[1].src).toBe('/api/v1/catalog/images/sony-headphones-side.webp');
      expect(details.specifications).toEqual([
        { label: 'SKU', value: 'SONY-WH-001' },
        { label: 'Brand', value: 'Sony' },
        { label: 'Category', value: 'Audio' },
      ]);
    });
  });

  describe('3. Active/Inactive Product Visibility & Error Handling', () => {
    it('propagates 404 error when customer attempts to access an inactive product', async () => {
      apiClient.mockRejectedValueOnce(
        new ApiError('Product with ID "inactive-uuid" not found', 404),
      );

      await expect(getCatalogProduct('inactive-uuid')).rejects.toThrow(
        /not found/,
      );
    });

    it('propagates 404 error when customer attempts to access a non-existent slug', async () => {
      apiClient.mockRejectedValueOnce(
        new ApiError('Product with slug "non-existent" not found', 404),
      );

      await expect(getCatalogProduct('non-existent')).rejects.toThrow(
        /not found/,
      );
    });
  });

  describe('4. Product Image Resolution & Removal of Mock Fallbacks', () => {
    it('normalizes local catalog image URLs for Next.js rewrite proxying', () => {
      expect(resolveCatalogImageUrl('/api/v1/catalog/images/product-abc.webp')).toBe(
        '/api/v1/catalog/images/product-abc.webp',
      );
      expect(resolveCatalogImageUrl('api/v1/catalog/images/product-abc.webp')).toBe(
        '/api/v1/catalog/images/product-abc.webp',
      );
    });

    it('preserves external image URLs (e.g. Unsplash or external CDN)', () => {
      const ext = 'https://images.unsplash.com/photo-1505740420928?w=800';
      expect(resolveCatalogImageUrl(ext)).toBe(ext);
    });

    it('does NOT return hardcoded Unsplash fallback for missing, null, or undefined image URLs', () => {
      expect(resolveCatalogImageUrl(null)).toBe('');
      expect(resolveCatalogImageUrl(undefined)).toBe('');
      expect(resolveCatalogImageUrl('')).toBe('');
    });

    it('toProductDetails returns an empty images array when a database product has no images (no Unsplash injection)', () => {
      const details = toProductDetails(mockProductNoImages);
      expect(details.images).toEqual([]);
    });

    it('toProductSummary returns an empty src when a database product has no images', () => {
      const summary = toProductSummary(mockProductNoImages);
      expect(summary.image.src).toBe('');
    });
  });

  describe('5. Removal of Mock Product Fallbacks & Error Distinctions on Storefront Homepage', () => {
    it('getStorefrontCatalog returns error status without silently masking API failures as empty catalogs', async () => {
      apiClient.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await getStorefrontCatalog();

      expect(result.products).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.error).toContain('Connection refused');
    });

    it('getStorefrontCatalog returns error: null and maps real database products when API succeeds', async () => {
      apiClient
        .mockResolvedValueOnce([
          {
            id: 'cat-1',
            name: 'Electronics',
            slug: 'electronics',
            _count: { products: 1 },
          },
        ])
        .mockResolvedValueOnce({
          data: [mockActiveProduct],
          total: 1,
          page: 1,
          limit: 12,
          totalPages: 1,
        });

      const result = await getStorefrontCatalog();

      expect(result.error).toBeNull();
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Sony Noise-Cancelling Headphones');
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].name).toBe('Electronics');
    });

    it('getStorefrontCatalog distinguishes legitimate empty catalog response from service failure', async () => {
      apiClient
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({
          data: [],
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
        });

      const result = await getStorefrontCatalog();

      expect(result.error).toBeNull();
      expect(result.products).toEqual([]);
      expect(result.categories).toEqual([]);
    });
  });
});

