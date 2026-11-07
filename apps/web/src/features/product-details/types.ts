import type { StorefrontImage } from '@/features/storefront/types';

export interface ProductSpec {
  label: string;
  value: string;
}

/**
 * View model for the product details page. Built from the catalog API's
 * CatalogProduct contract — only fields that exist in the database.
 */
export interface ProductDetails {
  id: string;
  name: string;
  /** Display brand; falls back to 'Shopkart' when the product has none. */
  brand: string;
  price: number;
  description: string | null;
  sku: string;
  category: { name: string; href: string };
  images: StorefrontImage[];
  specifications: ProductSpec[];
}
