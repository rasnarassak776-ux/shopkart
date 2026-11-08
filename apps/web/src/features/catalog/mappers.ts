import type { CategorySummary, ProductSummary } from '@/features/storefront/types';
import type { CatalogCategory, CatalogProduct } from './types';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

const unsplash = (id: string, width = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

// Categories have no image column yet; reuse the Phase 1 category photography
// by slug until category imagery is introduced.
const CATEGORY_IMAGES: Record<string, { src: string; alt: string }> = {
  electronics: {
    src: unsplash('1593642632559-0c6d3fc62b89'),
    alt: 'Laptop on a bright work desk',
  },
  fashion: {
    src: unsplash('1556905055-8f358a7a47b2'),
    alt: 'Folded knitwear, denim and a beanie',
  },
  'home-and-kitchen': {
    src: unsplash('1586023492125-27b2c045efd7'),
    alt: 'Yellow armchair in a modern living room',
  },
  beauty: {
    src: unsplash('1612817288484-6f916006741a'),
    alt: 'Skincare bottles arranged with stones',
  },
};

export function resolveCatalogImageUrl(url: string | null | undefined): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Return normalized relative URL for same-origin proxying via Next.js rewrite
  return url.startsWith('/') ? url : `/${url}`;
}

function primaryImage(product: CatalogProduct): { src: string; alt: string } {
  const image = product.images.find((img) => img.isPrimary) ?? product.images[0];
  return {
    src: resolveCatalogImageUrl(image?.imageUrl),
    alt: image?.altText ?? product.name,
  };
}

/**
 * Maps a catalog API product into the storefront ProductSummary view model.
 * The catalog has no review system yet, so rating fields stay undefined and
 * ProductCard hides the rating row for real catalog products.
 */
export function toProductSummary(product: CatalogProduct): ProductSummary {
  return {
    id: product.id,
    href: `/products/${product.id}`,
    brand: product.brand ?? 'Shopkart',
    name: product.name,
    price: Number(product.price),
    image: primaryImage(product),
  };
}

export function toCategorySummary(category: CatalogCategory): CategorySummary {
  return {
    slug: category.slug ?? category.id,
    name: category.name,
    href: `/products?category=${category.slug ?? category.id}`,
    itemCountLabel: `${category._count.products} item${category._count.products === 1 ? '' : 's'}`,
    image: {
      src: CATEGORY_IMAGES[category.slug ?? '']?.src ?? FALLBACK_IMAGE,
      alt: category.name,
    },
  };
}
