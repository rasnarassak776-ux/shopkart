/**
 * API contracts for the Shopkart catalog service.
 * Mirrors the responses returned by the NestJS catalog API
 * (apps/catalog-service). Do not duplicate these shapes elsewhere.
 */

export interface CatalogCategoryRef {
  id: string;
  name: string;
  slug: string | null;
}

export interface CatalogProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface CatalogProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string | null;
  sku: string;
  description: string | null;
  /** Decimal serialized as a string by the API. */
  price: string;
  brand: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: CatalogCategoryRef;
  images: CatalogProductImage[];
}

export interface CatalogProductsResponse {
  data: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children: CatalogCategory[];
  _count: { products: number };
}

export type CatalogSortBy = 'price' | 'name' | 'createdAt';
export type CatalogSortOrder = 'asc' | 'desc';

export interface CatalogProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: CatalogSortBy;
  sortOrder?: CatalogSortOrder;
}
