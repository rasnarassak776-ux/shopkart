'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { getCatalogCategories, getCatalogProducts } from './catalog-api';
import { toProductSummary } from './mappers';
import type { CatalogCategory, CatalogProduct } from './types';
import { CategoryList, CategoryListSkeleton } from './category-list';
import { ProductGrid, ProductGridSkeleton } from './product-grid';
import { ProductEmptyState, ProductErrorState } from './product-states';
import type { ProductSummary } from '@/features/storefront/types';

const PAGE_SIZE = 24;

interface CatalogBrowserProps {
  /** Raw `?category=` search param — accepts a category slug or id. */
  categoryParam?: string | null;
}

export function CatalogBrowser({ categoryParam }: CatalogBrowserProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Resolve the URL param (slug or id) once categories are loaded.
  const activeCategory = useMemo(() => {
    if (!categoryParam) return null;
    const match = categories.find(
      (c) => (c.slug ?? c.id) === categoryParam || c.id === categoryParam,
    );
    return match ? (match.slug ?? match.id) : categoryParam;
  }, [categories, categoryParam]);

  const activeCategoryId = useMemo(() => {
    if (!activeCategory) return undefined;
    return (
      categories.find((c) => (c.slug ?? c.id) === activeCategory)?.id ??
      undefined
    );
  }, [categories, activeCategory]);

  const activeCategoryName = useMemo(() => {
    if (!activeCategory) return null;
    return (
      categories.find((c) => (c.slug ?? c.id) === activeCategory)?.name ?? null
    );
  }, [categories, activeCategory]);

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);
    getCatalogCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setCategoriesError(
            err instanceof ApiError ? err.message : 'Failed to load categories.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);
    getCatalogProducts({
      limit: PAGE_SIZE,
      categoryId: activeCategoryId,
    })
      .then((res) => {
        if (!cancelled) setProducts(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setProductsError(
            err instanceof ApiError
              ? err.message
              : 'Failed to load products. Please try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const productSummaries: ProductSummary[] = useMemo(
    () => products.map(toProductSummary),
    [products],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={textStyles.h1}>Shop all products</h1>
        <p className={cn(textStyles.bodySm, 'mt-2')}>
          {activeCategoryName
            ? `Browsing ${activeCategoryName}`
            : 'Browse our full catalog'}
        </p>
      </div>

      {categoriesLoading ? (
        <CategoryListSkeleton />
      ) : categoriesError ? (
        <p className="text-sm text-red-600" role="alert">
          {categoriesError}
        </p>
      ) : (
        <CategoryList categories={categories} activeCategory={activeCategory} />
      )}

      {productsLoading ? (
        <ProductGridSkeleton />
      ) : productsError ? (
        <ProductErrorState message={productsError} onRetry={retry} />
      ) : productSummaries.length === 0 ? (
        <ProductEmptyState
          title={
            activeCategoryName
              ? `No products in ${activeCategoryName}`
              : 'No products available'
          }
          description={
            activeCategoryName
              ? 'This category does not have any products yet. Try another category.'
              : 'We could not find any products. Please check back soon.'
          }
          action={
            activeCategory
              ? { label: 'View all products', href: '/products' }
              : undefined
          }
        />
      ) : (
        <ProductGrid products={productSummaries} />
      )}
    </div>
  );
}
