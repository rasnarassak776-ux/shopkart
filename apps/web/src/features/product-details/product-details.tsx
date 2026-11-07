'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { getCatalogProduct, getCatalogProducts } from '@/features/catalog/catalog-api';
import type { CatalogProduct } from '@/features/catalog/types';
import { toProductSummary } from '@/features/catalog/mappers';
import type { ProductSummary } from '@/features/storefront/types';
import { toProductDetails } from './mappers';
import type { ProductDetails } from './types';
import { ProductBreadcrumb } from './product-breadcrumb';
import { ProductImageGallery } from './product-image-gallery';
import { ProductInformation } from './product-information';
import { ProductSpecifications } from './product-specifications';
import { RelatedProducts } from './related-products';
import {
  ProductDetailsError,
  ProductDetailsSkeleton,
  ProductNotFound,
} from './product-details-states';

const RELATED_LIMIT = 8;

interface ProductDetailsViewProps {
  productId: string;
}

export function ProductDetailsView({ productId }: ProductDetailsViewProps) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [related, setRelated] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProduct(null);
    setDetails(null);
    setRelated([]);

    getCatalogProduct(productId)
      .then(async (data) => {
        if (cancelled) return;
        setProduct(data);
        setDetails(toProductDetails(data));

        // Related products: same category, excluding the current product.
        try {
          const res = await getCatalogProducts({
            categoryId: data.categoryId,
            limit: RELATED_LIMIT + 1,
          });
          if (cancelled) return;
          setRelated(
            res.data
              .filter((p) => p.id !== data.id)
              .slice(0, RELATED_LIMIT)
              .map(toProductSummary),
          );
        } catch {
          // Related products are supplementary — keep the page usable.
          if (!cancelled) setRelated([]);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const notFound =
          err instanceof ApiError && (err.status === 404 || err.status === 400);
        setError({
          notFound,
          message: err instanceof ApiError ? err.message : 'Failed to load product.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  if (loading) {
    return <ProductDetailsSkeleton />;
  }

  if (error?.notFound) {
    return <ProductNotFound />;
  }

  if (error || !product || !details) {
    return (
      <ProductDetailsError
        message={error?.message}
        onRetry={retry}
      />
    );
  }

  return (
    <div className="space-y-10">
      <ProductBreadcrumb
        categoryName={details.category.name}
        categoryHref={details.category.href}
        productName={details.name}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductImageGallery images={details.images} productName={details.name} />
        <ProductInformation product={details} />
      </div>

      <ProductSpecifications specifications={details.specifications} />

      <RelatedProducts
        products={related}
        categoryName={details.category.name}
        categoryHref={details.category.href}
      />
    </div>
  );
}
