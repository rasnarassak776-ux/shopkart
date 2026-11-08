import { apiClient } from '@/lib/api-client';
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogProductQuery,
  CatalogProductsResponse,
} from './types';

export type {
  CatalogCategory,
  CatalogProduct,
  CatalogProductImage,
  CatalogProductQuery,
  CatalogProductsResponse,
  CatalogSortBy,
  CatalogSortOrder,
} from './types';

export const CATALOG_API_URL = (
  process.env.NEXT_PUBLIC_CATALOG_API_URL || 'http://localhost:3020'
).replace(/\/$/, '');

function buildQuery(query: CatalogProductQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetches a page of catalog products from the NestJS catalog service.
 * Reuses the centralized apiClient (auth token attachment, refresh retry,
 * error normalization) — the catalog endpoints are public.
 */
export async function getCatalogProducts(
  query: CatalogProductQuery = {},
  init?: RequestInit,
): Promise<CatalogProductsResponse> {
  return apiClient<CatalogProductsResponse>(
    `${CATALOG_API_URL}/api/v1/catalog/products${buildQuery(query)}`,
    init,
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fetches a single catalog product by its URL slug. */
export async function getCatalogProductBySlug(
  slug: string,
  init?: RequestInit,
): Promise<CatalogProduct> {
  return apiClient<CatalogProduct>(
    `${CATALOG_API_URL}/api/v1/catalog/products/slug/${encodeURIComponent(slug)}`,
    init,
  );
}

/**
 * Fetches a single catalog product by its UUID or URL slug.
 * UUIDs are queried against `/products/:id`; slugs against `/products/slug/:slug`.
 */
export async function getCatalogProduct(
  idOrSlug: string,
  init?: RequestInit,
): Promise<CatalogProduct> {
  if (UUID_REGEX.test(idOrSlug)) {
    return apiClient<CatalogProduct>(
      `${CATALOG_API_URL}/api/v1/catalog/products/${encodeURIComponent(idOrSlug)}`,
      init,
    );
  }
  return getCatalogProductBySlug(idOrSlug, init);
}

/** Fetches distinct brands across active products for filter options. */
export async function getCatalogBrands(
  init?: RequestInit,
): Promise<string[]> {
  return apiClient<string[]>(
    `${CATALOG_API_URL}/api/v1/catalog/products/brands`,
    init,
  );
}

/** Fetches active top-level categories for customer browsing. */
export async function getCatalogCategories(
  init?: RequestInit,
): Promise<CatalogCategory[]> {
  return apiClient<CatalogCategory[]>(
    `${CATALOG_API_URL}/api/v1/catalog/categories`,
    init,
  );
}
