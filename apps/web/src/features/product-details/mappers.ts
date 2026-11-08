import type { CatalogProduct } from '@/features/catalog/types';
import { resolveCatalogImageUrl } from '@/features/catalog/mappers';
import type { ProductDetails } from './types';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

function productImages(product: CatalogProduct) {
  const images = product.images
    .slice()
    .sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) ||
        a.displayOrder - b.displayOrder,
    )
    .map((image) => ({
      src: resolveCatalogImageUrl(image.imageUrl),
      alt: image.altText ?? product.name,
    }));
  return images.length > 0
    ? images
    : [{ src: FALLBACK_IMAGE, alt: product.name }];
}

/**
 * Maps a catalog API product into the product-details view model.
 * The schema has no attributes/specifications table, so the spec list is
 * limited to real product fields (SKU, brand, category).
 */
export function toProductDetails(product: CatalogProduct): ProductDetails {
  const categoryKey = product.category.slug ?? product.category.id;
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? 'Shopkart',
    price: Number(product.price),
    description: product.description,
    sku: product.sku,
    category: {
      name: product.category.name,
      href: `/products?category=${encodeURIComponent(categoryKey)}`,
    },
    images: productImages(product),
    specifications: [
      { label: 'SKU', value: product.sku },
      ...(product.brand ? [{ label: 'Brand', value: product.brand }] : []),
      { label: 'Category', value: product.category.name },
    ],
  };
}
