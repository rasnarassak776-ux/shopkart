import type { CategorySummary, ProductSummary } from '@/features/storefront/types';
import { getCatalogCategories, getCatalogProducts } from './catalog-api';
import { toCategorySummary, toProductSummary } from './mappers';

export interface StorefrontCatalog {
  categories: CategorySummary[];
  products: ProductSummary[];
  error?: string | null;
}

/**
 * Server-side loader for homepage sections. Retrieves real products and categories
 * from the catalog service.
 *
 * Explicitly distinguishes:
 * - Successful response containing products (products.length > 0, error: null)
 * - Successful response with zero products (products.length === 0, error: null)
 * - Catalog service unavailable / network error (error: string)
 *
 * Never silently converts API failures into successful empty product responses.
 */
export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  try {
    // no-store: catalog data must be fresh on every request (server-side fetch).
    const noStore = { cache: 'no-store' as const };
    const [categories, products] = await Promise.all([
      getCatalogCategories(noStore),
      getCatalogProducts({ limit: 16 }, noStore),
    ]);
    return {
      categories: categories.map(toCategorySummary),
      products: products.data.map(toProductSummary),
      error: null,
    };
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : 'Catalog Service is currently unavailable';
    console.warn('[storefront-data] Catalog service unreachable:', message);
    return {
      categories: [],
      products: [],
      error: message,
    };
  }
}
