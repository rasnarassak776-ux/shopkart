'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AdminErrorState,
  AdminNotice,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin';
import {
  buttonClasses,
  CheckIcon,
  ExternalLinkIcon,
  ShoppingBagIcon,
  Skeleton,
  ToastContainer,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { getAdminCategories, getAdminProduct } from './admin-catalog-api';
import { ProductForm } from './product-form';
import { ProductImageManager } from './product-image-manager';
import type { AdminCategory, AdminProduct } from './types';
import { useAdminToasts } from './use-admin-toasts';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; product?: AdminProduct; categories: AdminCategory[] };

interface ProductEditorProps {
  productId?: string;
}

export function ProductEditor({ productId }: ProductEditorProps) {
  const searchParams = useSearchParams();
  const { toasts, showToast, dismissToast } = useAdminToasts();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [productData, setProductData] = useState<AdminProduct | undefined>(undefined);

  const isEdit = Boolean(productId);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [categories, product] = await Promise.all([
        getAdminCategories(),
        productId ? getAdminProduct(productId) : Promise.resolve(undefined),
      ]);
      setState({ status: 'ready', categories, product });
      setProductData(product);
    } catch (err) {
      const notFound = err instanceof ApiError && (err.status === 404 || err.status === 400);
      setState({
        status: 'error',
        notFound,
        message: err instanceof Error ? err.message : 'Unable to load product data.',
      });
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const savedParam = searchParams.get('saved');
  const justCreated = savedParam === 'created';

  const title = isEdit
    ? productData
      ? `Edit “${productData.name}”`
      : 'Edit Product'
    : 'New Product';

  return (
    <>
      <AdminPageHeader
        title={title}
        description={
          isEdit
            ? 'Update product details, pricing, visibility, and manage media gallery.'
            : 'Add a new product to the catalog. You can upload product images immediately after saving.'
        }
        actions={
          productData ? (
            <Link
              href={`/products/${productData.slug || productData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'h-10' })}
            >
              <ExternalLinkIcon className="h-4 w-4" />
              View on Storefront
            </Link>
          ) : undefined
        }
      />

      {/* Post-creation banner guidance */}
      {justCreated && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-800"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-600 text-white">
            <CheckIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-success-900">Product created successfully!</p>
            <p className="mt-0.5 text-success-700">
              You can now upload product images below to showcase this item to customers on the storefront.
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {state.status === 'loading' && (
        <div className="grid gap-6 lg:grid-cols-3" aria-label="Loading product editor">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      )}

      {/* Error state */}
      {state.status === 'error' &&
        (state.notFound ? (
          <AdminNotice
            icon={ShoppingBagIcon}
            title="Product Not Found"
            description="The product you are trying to edit does not exist or may have been deleted."
            action={
              <Link href="/admin/products" className={buttonClasses({ size: 'sm' })}>
                Back to Products
              </Link>
            }
          />
        ) : (
          <AdminErrorState message={state.message} onRetry={load} />
        ))}

      {/* Ready state */}
      {state.status === 'ready' && (
        <div className="space-y-8">
          <ProductForm
            product={productData}
            categories={state.categories}
            onSaved={(updated) => {
              setProductData(updated);
              showToast('Product details saved successfully.', 'success');
            }}
          />

          {isEdit && productData ? (
            <div className="border-t border-line pt-8">
              <ProductImageManager
                product={productData}
                onImagesChange={(newImages) => {
                  setProductData((prev) => {
                    if (!prev) return prev;
                    const primary =
                      newImages.find((img) => img.isPrimary) ?? newImages[0] ?? null;
                    return {
                      ...prev,
                      images: newImages,
                      primaryImage: primary,
                    };
                  });
                }}
                onSuccessMessage={(msg) => showToast(msg, 'success')}
                onErrorMessage={(msg) => showToast(msg, 'error')}
              />
            </div>
          ) : (
            <AdminPanel className="flex items-center gap-4 p-5 text-sm text-ink-muted">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary">
                <ShoppingBagIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-ink">Image Upload Available After Saving</p>
                <p className="text-xs text-ink-muted">
                  Once your product is created, you will be able to upload up to 8 images, choose a primary image, and manage your storefront gallery.
                </p>
              </div>
            </AdminPanel>
          )}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
