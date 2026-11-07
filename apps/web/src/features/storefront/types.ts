/**
 * View models consumed by storefront presentation components.
 * The catalog phase should map API responses into these shapes so the
 * components stay independent of the data source.
 */

export interface StorefrontImage {
  src: string;
  alt: string;
}

export interface CategorySummary {
  slug: string;
  name: string;
  href: string;
  itemCountLabel: string;
  image: StorefrontImage;
}

export type ProductBadge = 'bestseller' | 'new' | 'limited';

export interface ProductSummary {
  id: string;
  href: string;
  brand: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  badge?: ProductBadge;
  image: StorefrontImage;
}

export type PromoTone = 'dark' | 'sand' | 'accent';

export interface Promotion {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  cta: { label: string; href: string };
  tone: PromoTone;
  image: StorefrontImage;
}
