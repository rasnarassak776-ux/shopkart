import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { CatalogClient } from './catalog.client';
import { CatalogProduct } from './catalog-product.interface';

describe('CatalogClient', () => {
  let client: CatalogClient;
  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3020'),
  };

  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogClient,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    client = module.get<CatalogClient>(CatalogClient);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('getProduct', () => {
    it('should successfully fetch and return a product', async () => {
      const mockProduct: CatalogProduct = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        sku: 'AUD-001',
        price: '299.99',
        isActive: true,
        images: [
          {
            id: 'img-1',
            productId: '11111111-1111-1111-1111-111111111111',
            imageUrl: 'https://example.com/headphones.jpg',
            displayOrder: 0,
            isPrimary: true,
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue(mockProduct),
      } as any);

      const result = await client.getProduct(mockProduct.id);
      expect(result).toEqual(mockProduct);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3020/api/v1/catalog/products/11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should handle product response wrapped in { data: product }', async () => {
      const mockProduct: CatalogProduct = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Mechanical Keyboard',
        slug: 'mech-keyboard',
        sku: 'KEY-001',
        price: '149.99',
        isActive: true,
      };

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({
          statusCode: 200,
          message: 'Product retrieved successfully',
          data: mockProduct,
        }),
      } as any);

      const result = await client.getProduct(mockProduct.id);
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product is not found (404)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        ok: false,
      } as any);

      const result = await client.getProduct('nonexistent-uuid');
      expect(result).toBeNull();
    });

    it('should return null when product id is invalid (400)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 400,
        ok: false,
      } as any);

      const result = await client.getProduct('invalid-id');
      expect(result).toBeNull();
    });

    it('should throw ServiceUnavailableException when catalog responds with 500', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 500,
        ok: false,
      } as any);

      await expect(client.getProduct('prod-id')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException on network error or timeout', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network connection failed'));

      await expect(client.getProduct('prod-id')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw ServiceUnavailableException when catalog returns invalid response structure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({ invalid: 'structure' }),
      } as any);

      await expect(client.getProduct('prod-id')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getPrimaryImageUrl', () => {
    it('should return primary image url when isPrimary is true', () => {
      const product: CatalogProduct = {
        id: 'p-1',
        name: 'Phone',
        slug: 'phone',
        sku: 'SKU-1',
        price: '999.00',
        isActive: true,
        images: [
          {
            id: 'img-1',
            productId: 'p-1',
            imageUrl: 'https://example.com/secondary.jpg',
            displayOrder: 0,
            isPrimary: false,
          },
          {
            id: 'img-2',
            productId: 'p-1',
            imageUrl: 'https://example.com/primary.jpg',
            displayOrder: 1,
            isPrimary: true,
          },
        ],
      };

      const url = client.getPrimaryImageUrl(product);
      expect(url).toBe('https://example.com/primary.jpg');
    });

    it('should fallback to image with lowest displayOrder when no primary image exists', () => {
      const product: CatalogProduct = {
        id: 'p-1',
        name: 'Phone',
        slug: 'phone',
        sku: 'SKU-1',
        price: '999.00',
        isActive: true,
        images: [
          {
            id: 'img-1',
            productId: 'p-1',
            imageUrl: 'https://example.com/order-2.jpg',
            displayOrder: 2,
            isPrimary: false,
          },
          {
            id: 'img-2',
            productId: 'p-1',
            imageUrl: 'https://example.com/order-0.jpg',
            displayOrder: 0,
            isPrimary: false,
          },
        ],
      };

      const url = client.getPrimaryImageUrl(product);
      expect(url).toBe('https://example.com/order-0.jpg');
    });

    it('should return null when product has no images', () => {
      const product: CatalogProduct = {
        id: 'p-1',
        name: 'Phone',
        slug: 'phone',
        sku: 'SKU-1',
        price: '999.00',
        isActive: true,
        images: [],
      };

      expect(client.getPrimaryImageUrl(product)).toBeNull();
    });
  });
});
