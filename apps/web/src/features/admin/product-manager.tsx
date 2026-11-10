'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AdminErrorState,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin';
import {
  AlertCircleIcon,
  Badge,
  Button,
  buttonClasses,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExternalLinkIcon,
  fieldClasses,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  Skeleton,
  SpinnerIcon,
  ToastContainer,
  TrashIcon,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { resolveCatalogImageUrl } from '@/features/catalog/mappers';
import {
  deleteAdminProduct,
  getAdminCategories,
  getAdminProducts,
  setAdminProductStatus,
} from './admin-catalog-api';
import type {
  AdminCategory,
  AdminProduct,
  AdminProductsQuery,
  AdminProductsResponse,
} from './types';
import { useAdminToasts } from './use-merchant-toasts';

const SAVED_MESSAGES: Record<string, string> = {
  created: 'Product created successfully.',
  updated: 'Product updated successfully.',
};

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatPrice(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'sku';

const SORT_OPTIONS: { label: string; value: SortKey; sortBy: AdminProductsQuery['sortBy']; sortOrder: AdminProductsQuery['sortOrder'] }[] = [
  { label: 'Newest First', value: 'newest', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Oldest First', value: 'oldest', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Name (A to Z)', value: 'name-asc', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Name (Z to A)', value: 'name-desc', sortBy: 'name', sortOrder: 'desc' },
  { label: 'Price (Low to High)', value: 'price-asc', sortBy: 'price', sortOrder: 'asc' },
  { label: 'Price (High to Low)', value: 'price-desc', sortBy: 'price', sortOrder: 'desc' },
  { label: 'SKU (A to Z)', value: 'sku', sortBy: 'sku', sortOrder: 'asc' },
];

export function ProductManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, showToast, dismissToast } = useAdminToasts();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [response, setResponse] = useState<AdminProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortKey>('newest');

  // Pending action states
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<string>>(new Set());

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteConflictError, setDeleteConflictError] = useState<string | null>(null);

  // Handle URL saved toast
  const saved = searchParams.get('saved');
  useEffect(() => {
    if (saved && SAVED_MESSAGES[saved]) {
      showToast(SAVED_MESSAGES[saved]);
      router.replace('/merchant/products', { scroll: false });
    }
  }, [saved, showToast, router]);

  // Load categories for filter dropdown
  useEffect(() => {
    getAdminCategories()
      .then(setCategories)
      .catch((err) => {
        console.error('Failed to load categories for filtering:', err);
      });
  }, []);

  // Fetch products query
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selectedSort = SORT_OPTIONS.find((s) => s.value === sortOption) || SORT_OPTIONS[0];

      const queryParams: AdminProductsQuery = {
        page,
        limit: 10,
        search: appliedSearch || undefined,
        categoryId: categoryFilter || undefined,
        isActive:
          statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        sortBy: selectedSort.sortBy,
        sortOrder: selectedSort.sortOrder,
      };

      const res = await getAdminProducts(queryParams);
      setResponse(res);
    } catch (err) {
      setError(errorMessage(err, 'Unable to load products.'));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, categoryFilter, statusFilter, sortOption]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setPage(1);
  };

  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as SortKey);
    setPage(1);
  };

  // Status Toggle
  const handleToggleStatus = async (product: AdminProduct) => {
    setPendingStatusIds((prev) => new Set(prev).add(product.id));
    try {
      const updated = await setAdminProductStatus(product.id, !product.isActive);
      setResponse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((p) => (p.id === updated.id ? updated : p)),
        };
      });
      showToast(`"${product.name}" is now ${updated.isActive ? 'active' : 'inactive'}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Unable to update product status.'), 'error');
    } finally {
      setPendingStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  // Open Delete Modal
  const openDeleteDialog = (product: AdminProduct) => {
    setDeleteConflictError(null);
    setDeleteTarget(product);
  };

  const closeDeleteDialog = () => {
    if (deletePending) return;
    setDeleteTarget(null);
    setDeleteConflictError(null);
  };

  // Execute Deletion
  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;

    setDeletePending(true);
    setDeleteConflictError(null);
    try {
      await deleteAdminProduct(deleteTarget.id);
      showToast(`Product "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      // Reload products list
      await loadProducts();
    } catch (err) {
      const message = errorMessage(err, 'Failed to delete product.');
      // Display conflict message inside modal (e.g. historical orders or inventory stock)
      setDeleteConflictError(message);
    } finally {
      setDeletePending(false);
    }
  };

  // Deactivate instead (convenience button inside conflict modal)
  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await setAdminProductStatus(deleteTarget.id, false);
      showToast(`"${deleteTarget.name}" has been deactivated.`);
      setDeleteTarget(null);
      setDeleteConflictError(null);
      await loadProducts();
    } catch (err) {
      showToast(errorMessage(err, 'Failed to deactivate product.'), 'error');
    } finally {
      setDeletePending(false);
    }
  };

  const products = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;

  const paginationStart = total === 0 ? 0 : (page - 1) * 10 + 1;
  const paginationEnd = Math.min(page * 10, total);

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Manage the complete catalog: create items, configure prices, upload high-resolution media, and control storefront visibility."
        actions={
          <Link
            href="/merchant/products/new"
            className={buttonClasses({ variant: 'accent', size: 'md' })}
          >
            <PlusIcon className="h-4 w-4" />
            New Product
          </Link>
        }
      />

      {error && <AdminErrorState message={error} onRetry={loadProducts} />}

      {!error && (
        <AdminPanel>
          {/* Controls Bar: Search, Category Filter, Status Tabs, Sort */}
          <div className="space-y-3 border-b border-line p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-md">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <label htmlFor="product-search" className="sr-only">
                  Search products by name, SKU or brand
                </label>
                <input
                  id="product-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, SKU or brand..."
                  className={cn(fieldClasses(), 'h-11 pl-9 pr-8')}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* Status Filter Pills */}
              <div
                role="group"
                aria-label="Filter by status"
                className="inline-flex rounded-lg bg-surface-muted p-1"
              >
                {(['all', 'active', 'inactive'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleStatusChange(option)}
                    aria-pressed={statusFilter === option}
                    className={cn(
                      'h-9 rounded-md px-3 text-sm font-medium capitalize transition-colors',
                      statusFilter === option
                        ? 'bg-surface text-ink shadow-card'
                        : 'text-ink-secondary hover:text-ink',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-row: Category Filter & Sort Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {/* Category select */}
                <div className="flex items-center gap-2">
                  <label htmlFor="category-filter" className="text-xs font-medium text-ink-muted">
                    Category:
                  </label>
                  <select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={handleCategoryChange}
                    className={cn(fieldClasses(), 'h-9 py-1 text-xs')}
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent ? `${c.parent.name} › ` : ''}
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort select */}
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-filter" className="text-xs font-medium text-ink-muted">
                    Sort:
                  </label>
                  <select
                    id="sort-filter"
                    value={sortOption}
                    onChange={handleSortChange}
                    className={cn(fieldClasses(), 'h-9 py-1 text-xs')}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total indicator */}
              <span className="text-xs tabular-nums text-ink-muted">
                {loading ? 'Updating...' : `${total} product${total === 1 ? '' : 's'} total`}
              </span>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && !response && (
            <div className="space-y-3 p-4" aria-label="Loading products">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Empty Catalog State */}
          {!loading && total === 0 && !appliedSearch && !categoryFilter && statusFilter === 'all' && (
            <AdminNotice
              icon={ShoppingBagIcon}
              title="No products yet"
              description="Get started by creating your first product to display on the storefront."
              className="border-0 shadow-none"
              action={
                <Link
                  href="/merchant/products/new"
                  className={buttonClasses({ size: 'sm' })}
                >
                  <PlusIcon className="h-4 w-4" />
                  New Product
                </Link>
              }
            />
          )}

          {/* Filtered Empty State */}
          {!loading && total === 0 && (appliedSearch || categoryFilter || statusFilter !== 'all') && (
            <div className="px-4 py-16 text-center">
              <ShoppingBagIcon className="mx-auto h-10 w-10 text-ink-muted" />
              <h3 className="mt-3 text-base font-semibold text-ink">No matching products found</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Try adjusting your search criteria, clearing category filters, or selecting &ldquo;All&rdquo; statuses.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setAppliedSearch('');
                  setCategoryFilter('');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Product Data Table */}
          {products.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th scope="col" className="w-16 px-4 py-3">Image</th>
                      <th scope="col" className="px-4 py-3">Product</th>
                      <th scope="col" className="px-4 py-3">SKU</th>
                      <th scope="col" className="px-4 py-3">Category</th>
                      <th scope="col" className="px-4 py-3">Brand</th>
                      <th scope="col" className="px-4 py-3 text-right">Price</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="hidden px-4 py-3 xl:table-cell">Created</th>
                      <th scope="col" className="px-4 py-3 text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {products.map((product) => {
                      const image = product.primaryImage || product.images?.[0];
                      const imageUrl = image ? resolveCatalogImageUrl(image.imageUrl) : null;
                      const isPending = pendingStatusIds.has(product.id);

                      return (
                        <tr key={product.id} className="hover:bg-surface-muted/40">
                          {/* Image Thumbnail */}
                          <td className="px-4 py-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={image?.altText || product.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-ink-muted">
                                  <ShoppingBagIcon className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Name & Slug */}
                          <td className="max-w-xs px-4 py-3">
                            <Link
                              href={`/merchant/products/${product.id}/edit`}
                              className="font-medium text-ink hover:text-accent-600 hover:underline line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            {product.slug && (
                              <p className="text-xs text-ink-muted">/{product.slug}</p>
                            )}
                          </td>

                          {/* SKU */}
                          <td className="px-4 py-3 font-mono text-xs font-medium uppercase text-ink-secondary">
                            {product.sku}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3 text-ink-secondary">
                            {product.category?.name || '—'}
                          </td>

                          {/* Brand */}
                          <td className="px-4 py-3 text-ink-secondary">
                            {product.brand || '—'}
                          </td>

                          {/* Price */}
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                            {formatPrice(product.price)}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge active={product.isActive} />
                          </td>

                          {/* Created */}
                          <td className="hidden px-4 py-3 text-xs text-ink-muted xl:table-cell">
                            {dateFormat.format(new Date(product.createdAt))}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View on storefront */}
                              <Link
                                href={`/products/${product.slug || product.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonClasses({
                                  variant: 'ghost',
                                  size: 'sm',
                                  className: 'h-9 px-2 text-ink-muted hover:text-ink',
                                })}
                                title="View on storefront"
                                aria-label={`View ${product.name} on storefront`}
                              >
                                <ExternalLinkIcon className="h-4 w-4" />
                              </Link>

                              {/* Edit link */}
                              <Link
                                href={`/merchant/products/${product.id}/edit`}
                                className={buttonClasses({
                                  variant: 'ghost',
                                  size: 'sm',
                                  className: 'h-9 px-2.5',
                                })}
                                aria-label={`Edit ${product.name}`}
                              >
                                <PencilIcon className="h-4 w-4" />
                                <span className="hidden lg:inline">Edit</span>
                              </Link>

                              {/* Status Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(product)}
                                disabled={isPending}
                                className={buttonClasses({
                                  variant: 'secondary',
                                  size: 'sm',
                                  className: cn(
                                    'h-9 min-w-[6.5rem]',
                                    product.isActive ? 'text-ink' : 'text-success-700',
                                  ),
                                })}
                              >
                                {isPending && <SpinnerIcon className="h-3.5 w-3.5" />}
                                {product.isActive ? 'Deactivate' : 'Activate'}
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => openDeleteDialog(product)}
                                className={buttonClasses({
                                  variant: 'ghost',
                                  size: 'sm',
                                  className: 'h-9 px-2 text-danger hover:bg-danger/10 hover:text-danger',
                                })}
                                aria-label={`Delete ${product.name}`}
                                title="Delete product"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <ul className="divide-y divide-line md:hidden">
                {products.map((product) => {
                  const image = product.primaryImage || product.images?.[0];
                  const imageUrl = image ? resolveCatalogImageUrl(image.imageUrl) : null;
                  const isPending = pendingStatusIds.has(product.id);

                  return (
                    <li key={product.id} className="p-4">
                      <div className="flex gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={image?.altText || product.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-ink-muted">
                              <ShoppingBagIcon className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/merchant/products/${product.id}/edit`}
                              className="font-medium text-ink hover:underline line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            <StatusBadge active={product.isActive} />
                          </div>
                          <p className="font-mono text-xs text-ink-muted">{product.sku}</p>
                          <p className="mt-1 text-sm font-semibold text-ink">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-3 text-xs text-ink-secondary">
                        <span>Category: {product.category?.name || '—'}</span>
                        <span>Brand: {product.brand || '—'}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.slug || product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonClasses({
                            variant: 'ghost',
                            size: 'sm',
                            className: 'h-9 px-2 text-ink-muted',
                          })}
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/merchant/products/${product.id}/edit`}
                          className={buttonClasses({
                            variant: 'secondary',
                            size: 'sm',
                            className: 'h-9 px-3',
                          })}
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(product)}
                          disabled={isPending}
                          className={buttonClasses({
                            variant: 'secondary',
                            size: 'sm',
                            className: 'h-9 min-w-[6.5rem]',
                          })}
                        >
                          {isPending && <SpinnerIcon className="h-3.5 w-3.5" />}
                          {product.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(product)}
                          className={buttonClasses({
                            variant: 'ghost',
                            size: 'sm',
                            className: 'h-9 px-2 text-danger hover:bg-danger/10',
                          })}
                          aria-label={`Delete ${product.name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination Controls */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-line p-4 sm:flex-row">
                <p className="text-xs text-ink-muted">
                  Showing <span className="font-medium text-ink">{paginationStart}</span> to{' '}
                  <span className="font-medium text-ink">{paginationEnd}</span> of{' '}
                  <span className="font-medium text-ink">{total}</span> products
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="px-2 text-xs font-medium tabular-nums text-ink">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </AdminPanel>
      )}

      {/* Product Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                <TrashIcon className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deletePending}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <h3 id="delete-dialog-title" className="mt-4 font-display text-lg font-bold text-ink">
              Delete &ldquo;{deleteTarget.name}&rdquo;?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Are you sure you want to delete this product? This action cannot be undone. Product images and cart references will be removed.
            </p>

            {/* Conflict Alert (e.g., historical orders or active inventory stock) */}
            {deleteConflictError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-700"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold text-danger-800">Deletion Blocked by Catalog Rules</p>
                    <p className="mt-1 text-xs leading-relaxed">{deleteConflictError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                disabled={deletePending}
                onClick={closeDeleteDialog}
                className="sm:min-w-[6rem]"
              >
                Cancel
              </Button>

              {deleteConflictError ? (
                <Button
                  variant="primary"
                  disabled={deletePending}
                  onClick={handleDeactivateInstead}
                  className="sm:min-w-[10rem]"
                >
                  {deletePending && <SpinnerIcon className="h-4 w-4" />}
                  Deactivate Instead
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={deletePending}
                  onClick={handleDeleteProduct}
                  className="bg-danger text-white hover:bg-danger-600 sm:min-w-[8rem]"
                >
                  {deletePending && <SpinnerIcon className="h-4 w-4" />}
                  Delete Product
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
