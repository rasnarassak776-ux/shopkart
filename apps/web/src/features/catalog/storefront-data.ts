import type { CategorySummary, ProductSummary } from '@/features/storefront/types';
import { getCatalogCategories, getCatalogProducts } from './catalog-api';
import { toCategorySummary, toProductSummary } from './mappers';

export interface StorefrontCatalog {
  categories: CategorySummary[];
  products: ProductSummary[];
}

/**
 * Server-side loader for homepage sections. Returns an empty result when the
 * catalog service is unreachable so callers can fall back to presentation data.
 */
export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  try {
    // no-store: catalog data must be fresh on every request (server-side fetch).
    const noStore = { cache: 'no-store' as const };
    const [categories, products] = await Promise.all([
      getCatalogCategories(noStore),
      getCatalogProducts({ limit: 12 }, noStore),
    ]);
    return {
      categories: categories.map(toCategorySummary),
      products: products.data.map(toProductSummary),
    };
  } catch {
    return { categories: [], products: [] };
  }
}
