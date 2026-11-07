'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import {
  getCatalogBrands,
  getCatalogCategories,
  getCatalogProducts,
} from './catalog-api';
import { toProductSummary } from './mappers';
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogProductQuery,
  CatalogSortBy,
  CatalogSortOrder,
} from './types';
import { CategoryList, CategoryListSkeleton } from './category-list';
import { ProductGrid, ProductGridSkeleton } from './product-grid';
import {
  ProductEmptyState,
  ProductErrorState,
  SearchEmptyState,
} from './product-states';
import { ProductSearchBar } from './product-search-bar';
import { ProductFilters, type ProductFilterValues } from './product-filters';
import { ProductSort } from './product-sort';
import { ProductPagination } from './product-pagination';
import type { ProductSummary } from '@/features/storefront/types';

const PAGE_SIZE = 12;
const SORT_FIELDS: CatalogSortBy[] = ['price', 'name', 'createdAt'];
const SORT_ORDERS: CatalogSortOrder[] = ['asc', 'desc'];

interface CatalogBrowserProps {
  /** Raw Next.js `searchParams` for the /products route. */
  searchParams: Record<string, string | string[] | undefined>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isInteger(num) && num >= 1 ? num : undefined;
}

function toPrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function toSortBy(value: string | undefined): CatalogSortBy | undefined {
  return SORT_FIELDS.includes(value as CatalogSortBy)
    ? (value as CatalogSortBy)
    : undefined;
}

function toSortOrder(value: string | undefined): CatalogSortOrder | undefined {
  return SORT_ORDERS.includes(value as CatalogSortOrder)
    ? (value as CatalogSortOrder)
    : undefined;
}

/**
 * Storefront catalog browser. All browsing state (search, category, price,
 * brand, sort, page) lives in the URL query string so results are shareable,
 * survive refreshes and support back/forward navigation.
 */
export function CatalogBrowser({ searchParams }: CatalogBrowserProps) {
  const router = useRouter();

  // ---- Parsed URL state (single source of truth) ----
  const search = first(searchParams.search)?.trim() ?? '';
  const categoryParam = first(searchParams.category) ?? null;
  const minPriceParam = first(searchParams.minPrice);
  const maxPriceParam = first(searchParams.maxPrice);
  const brandParam = first(searchParams.brand) ?? undefined;
  const sortByParam = toSortBy(first(searchParams.sortBy));
  const sortOrderParam = toSortOrder(first(searchParams.sortOrder));
  const pageParam = toPositiveInt(first(searchParams.page)) ?? 1;

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ---- Canonical param record used for every navigation ----
  const canonicalParams = useMemo<Record<string, string | undefined>>(
    () => ({
      search: search || undefined,
      category: categoryParam ?? undefined,
      minPrice: minPriceParam || undefined,
      maxPrice: maxPriceParam || undefined,
      brand: brandParam,
      sortBy: sortByParam,
      sortOrder: sortOrderParam,
      page: pageParam > 1 ? String(pageParam) : undefined,
    }),
    [
      search,
      categoryParam,
      minPriceParam,
      maxPriceParam,
      brandParam,
      sortByParam,
      sortOrderParam,
      pageParam,
    ],
  );

  const navigate = useCallback(
    (patch: Record<string, string | undefined>) => {
      const merged = { ...canonicalParams, ...patch };
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(merged)) {
        if (value) params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `/products?${qs}` : '/products');
    },
    [canonicalParams, router],
  );

  // ---- Resolve category slug/id once categories load ----
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

  // ---- Load categories and brands once ----
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
    getCatalogBrands()
      .then((data) => {
        if (!cancelled) setBrands(data);
      })
      .catch(() => {
        // Brand filter is optional — silently omit options on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Fetch products for the current URL state ----
  const productQuery = useMemo<CatalogProductQuery>(
    () => ({
      page: pageParam,
      limit: PAGE_SIZE,
      search: search || undefined,
      categoryId: activeCategoryId,
      minPrice: toPrice(minPriceParam),
      maxPrice: toPrice(maxPriceParam),
      brand: brandParam,
      sortBy: sortByParam,
      sortOrder: sortOrderParam,
    }),
    [
      pageParam,
      search,
      activeCategoryId,
      minPriceParam,
      maxPriceParam,
      brandParam,
      sortByParam,
      sortOrderParam,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);
    getCatalogProducts(productQuery)
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        // If the requested page is beyond the result set (e.g. filters
        // changed), snap back to the last available page.
        if (res.totalPages > 0 && pageParam > res.totalPages) {
          navigate({ page: String(res.totalPages) });
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(productQuery), reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const productSummaries: ProductSummary[] = useMemo(
    () => products.map(toProductSummary),
    [products],
  );

  // ---- Handlers ----
  const handleSearch = useCallback(
    (query: string) => navigate({ search: query || undefined, page: undefined }),
    [navigate],
  );

  const handleFiltersApply = useCallback(
    (patch: ProductFilterValues) => {
      const next: Record<string, string | undefined> = { page: undefined };
      if ('category' in patch) next.category = patch.category;
      if ('minPrice' in patch) next.minPrice = patch.minPrice;
      if ('maxPrice' in patch) next.maxPrice = patch.maxPrice;
      if ('brand' in patch) next.brand = patch.brand;
      navigate(next);
    },
    [navigate],
  );

  const handleClearFilters = useCallback(() => {
    navigate({
      search: undefined,
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      brand: undefined,
      page: undefined,
    });
  }, [navigate]);

  const handleSortChange = useCallback(
    (sort: { sortBy?: CatalogSortBy; sortOrder?: CatalogSortOrder }) => {
      const isDefault =
        sort.sortBy === 'createdAt' && sort.sortOrder === 'desc';
      navigate({
        sortBy: isDefault ? undefined : sort.sortBy,
        sortOrder: isDefault ? undefined : sort.sortOrder,
        page: undefined,
      });
    },
    [navigate],
  );

  const handlePage = useCallback(
    (page: number) => navigate({ page: page > 1 ? String(page) : undefined }),
    [navigate],
  );

  const hasActiveFilters = Boolean(
    categoryParam || minPriceParam || maxPriceParam || brandParam,
  );
  const hasSearchOrFilters = Boolean(search) || hasActiveFilters;

  const filterValues: ProductFilterValues = {
    category: activeCategory ?? undefined,
    minPrice: minPriceParam || undefined,
    maxPrice: maxPriceParam || undefined,
    brand: brandParam,
  };

  const heading = search
    ? `Results for “${search}”`
    : activeCategoryName
      ? `Browsing ${activeCategoryName}`
      : 'Shop all products';

  return (
    <div className="space-y-6">
      <div>
        <h1 className={textStyles.h1}>{heading}</h1>
        <p className={cn(textStyles.bodySm, 'mt-2')}>
          {productsLoading
            ? 'Loading products…'
            : `${total} product${total === 1 ? '' : 's'} found`}
        </p>
      </div>

      <ProductSearchBar value={search} onSubmit={handleSearch} />

      {categoriesLoading ? (
        <CategoryListSkeleton />
      ) : categoriesError ? (
        <p className="text-sm text-red-600" role="alert">
          {categoriesError}
        </p>
      ) : (
        <CategoryList
          categories={categories}
          activeCategory={activeCategory}
          preserveParams={canonicalParams}
        />
      )}

      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <aside>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-ink-muted lg:hidden"
          >
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-accent-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                •
              </span>
            )}
          </button>
          <div className={cn(filtersOpen ? 'block' : 'hidden', 'lg:block')}>
            <ProductFilters
              categories={categories}
              brands={brands}
              values={filterValues}
              onApply={handleFiltersApply}
              onClearAll={handleClearFilters}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <ProductSort
              sortBy={sortByParam}
              sortOrder={sortOrderParam}
              onChange={handleSortChange}
            />
          </div>

          {productsLoading ? (
            <ProductGridSkeleton />
          ) : productsError ? (
            <ProductErrorState message={productsError} onRetry={retry} />
          ) : productSummaries.length === 0 ? (
            search ? (
              <SearchEmptyState query={search} onClear={handleClearFilters} />
            ) : hasActiveFilters ? (
              <ProductEmptyState
                title="No products match your filters"
                description="Try widening the price range or choosing a different category or brand."
                action={{ label: 'Clear all filters', href: '/products' }}
              />
            ) : (
              <ProductEmptyState
                title="No products available"
                description="We could not find any products. Please check back soon."
              />
            )
          ) : (
            <ProductGrid products={productSummaries} />
          )}

          {!productsLoading && !productsError && totalPages > 1 && (
            <ProductPagination
              page={pageParam}
              totalPages={totalPages}
              onNavigate={handlePage}
            />
          )}
        </section>
      </div>
    </div>
  );
}
