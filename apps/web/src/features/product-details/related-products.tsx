import React from 'react';
import { SectionHeading } from '@/components/ui';
import { ProductGrid } from '@/features/catalog/product-grid';
import type { ProductSummary } from '@/features/storefront/types';

interface RelatedProductsProps {
  products: ProductSummary[];
  categoryName: string;
  categoryHref: string;
}

/**
 * Same-category products shown under the details page. Hidden entirely when
 * the catalog has no other products in the category.
 */
export function RelatedProducts({ products, categoryName, categoryHref }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="related-products-heading">
      <SectionHeading
        id="related-products-heading"
        title="You may also like"
        description={`More from ${categoryName}`}
        action={{ label: 'View all', href: categoryHref }}
      />
      <ProductGrid products={products} />
    </section>
  );
}
