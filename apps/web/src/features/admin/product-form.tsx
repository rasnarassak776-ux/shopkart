'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminErrorState, AdminPanel } from '@/components/admin';
import {
  Button,
  buttonClasses,
  FieldError,
  FieldHint,
  fieldClasses,
  Input,
  Label,
  SpinnerIcon,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import {
  createAdminProduct,
  updateAdminProduct,
} from './admin-catalog-api';
import { SLUG_PATTERN, slugify } from './category-utils';
import type {
  AdminCategory,
  AdminProduct,
  CreateAdminProductInput,
  UpdateAdminProductInput,
} from './types';

interface ProductFormProps {
  /** Existing product when editing; omitted when creating. */
  product?: AdminProduct;
  /** All available categories for the category selector. */
  categories: AdminCategory[];
  /** Callback fired after successfully updating an existing product. */
  onSaved?: (product: AdminProduct) => void;
}

type FieldErrors = Partial<
  Record<'name' | 'sku' | 'categoryId' | 'price' | 'slug' | 'brand' | 'description', string>
>;

export function ProductForm({ product, categories, onSaved }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? (categories[0]?.id || ''));
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Product name is required.';
    } else if (name.trim().length > 180) {
      errors.name = 'Name must be 180 characters or fewer.';
    }

    if (!sku.trim()) {
      errors.sku = 'SKU is required.';
    } else if (sku.trim().length > 80) {
      errors.sku = 'SKU must be 80 characters or fewer.';
    }

    if (!categoryId.trim()) {
      errors.categoryId = 'Please select a category.';
    }

    const parsedPrice = parseFloat(price.trim());
    if (!price.trim()) {
      errors.price = 'Price is required.';
    } else if (isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.price = 'Price must be a positive number greater than 0.';
    }

    if (brand.trim().length > 100) {
      errors.brand = 'Brand must be 100 characters or fewer.';
    }

    if (description.length > 2000) {
      errors.description = 'Description must be 2000 characters or fewer.';
    }

    if (slug.trim() && !SLUG_PATTERN.test(slug.trim())) {
      errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
    } else if (slug.trim().length > 200) {
      errors.slug = 'Slug must be 200 characters or fewer.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessNotice(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      if (product) {
        const updatePayload: UpdateAdminProductInput = {
          name: name.trim(),
          sku: sku.trim(),
          categoryId: categoryId.trim(),
          price: parseFloat(price.trim()),
          brand: brand.trim() || null,
          slug: slug.trim() || null,
          description: description.trim() || null,
          isActive,
        };

        const updated = await updateAdminProduct(product.id, updatePayload);
        setSuccessNotice('Product details updated successfully.');
        onSaved?.(updated);
      } else {
        const createPayload: CreateAdminProductInput = {
          name: name.trim(),
          sku: sku.trim(),
          categoryId: categoryId.trim(),
          price: parseFloat(price.trim()),
          brand: brand.trim() || null,
          slug: slug.trim() || null,
          description: description.trim() || null,
          isActive,
        };

        const created = await createAdminProduct(createPayload);
        // Direct admin to the edit page to immediately upload product images
        router.push(`/admin/products/${created.id}/edit?saved=created`);
      }
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to save the product.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const slugPreview = slug.trim() || slugify(name);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
      {/* Main product attributes */}
      <div className="space-y-6 lg:col-span-2">
        {serverError && <AdminErrorState message={serverError} />}

        {successNotice && (
          <div
            role="status"
            className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success-700"
          >
            {successNotice}
          </div>
        )}

        <AdminPanel className="space-y-5 p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-ink">Product Details</h2>

          {/* Name */}
          <div>
            <Label htmlFor="product-name">
              Product Name <span className="text-danger">*</span>
            </Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              invalid={Boolean(fieldErrors.name)}
              maxLength={180}
              disabled={submitting}
              className="mt-1.5"
              placeholder="e.g. Wireless Noise-Cancelling Headphones"
              autoFocus={!isEdit}
            />
            {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
          </div>

          {/* SKU & Price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="product-sku">
                SKU (Stock Keeping Unit) <span className="text-danger">*</span>
              </Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value.toUpperCase());
                  if (fieldErrors.sku) setFieldErrors((prev) => ({ ...prev, sku: undefined }));
                }}
                invalid={Boolean(fieldErrors.sku)}
                maxLength={80}
                disabled={submitting}
                className="mt-1.5 font-mono uppercase"
                placeholder="e.g. WN-CH-001"
              />
              {fieldErrors.sku ? (
                <FieldError>{fieldErrors.sku}</FieldError>
              ) : (
                <FieldHint>Must be unique across the catalog.</FieldHint>
              )}
            </div>

            <div>
              <Label htmlFor="product-price">
                Price (₹) <span className="text-danger">*</span>
              </Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: undefined }));
                }}
                invalid={Boolean(fieldErrors.price)}
                disabled={submitting}
                className="mt-1.5 tabular-nums"
                placeholder="e.g. 2999.00"
              />
              {fieldErrors.price ? (
                <FieldError>{fieldErrors.price}</FieldError>
              ) : (
                <FieldHint>Positive selling price in Indian Rupees (₹).</FieldHint>
              )}
            </div>
          </div>

          {/* Brand */}
          <div>
            <Label htmlFor="product-brand">Brand</Label>
            <Input
              id="product-brand"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                if (fieldErrors.brand) setFieldErrors((prev) => ({ ...prev, brand: undefined }));
              }}
              invalid={Boolean(fieldErrors.brand)}
              maxLength={100}
              disabled={submitting}
              className="mt-1.5"
              placeholder="e.g. Sony, Apple, Samsung"
            />
            {fieldErrors.brand && <FieldError>{fieldErrors.brand}</FieldError>}
          </div>

          {/* URL Slug */}
          <div>
            <Label htmlFor="product-slug">URL Slug</Label>
            <Input
              id="product-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                if (fieldErrors.slug) setFieldErrors((prev) => ({ ...prev, slug: undefined }));
              }}
              invalid={Boolean(fieldErrors.slug)}
              maxLength={200}
              disabled={submitting}
              className="mt-1.5"
              placeholder={slugify(name) || 'generated-from-name'}
            />
            {fieldErrors.slug ? (
              <FieldError>{fieldErrors.slug}</FieldError>
            ) : (
              <FieldHint>
                {slugPreview ? (
                  <>
                    Storefront product URL segment:{' '}
                    <span className="font-medium text-ink-secondary">/products/{slugPreview}</span>
                    {!slug.trim() && ' (generated from name)'}
                  </>
                ) : (
                  'Leave blank to automatically derive from the product name.'
                )}
              </FieldHint>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="product-description">Description</Label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              rows={5}
              maxLength={2000}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.description) || undefined}
              className={cn(fieldClasses(Boolean(fieldErrors.description)), 'mt-1.5 resize-y')}
              placeholder="Detailed description of features, specifications, and warranty..."
            />
            {fieldErrors.description ? (
              <FieldError>{fieldErrors.description}</FieldError>
            ) : (
              <FieldHint>{description.length}/2000 characters</FieldHint>
            )}
          </div>
        </AdminPanel>
      </div>

      {/* Side column: Organisation & Actions */}
      <div className="space-y-6">
        <AdminPanel className="space-y-5 p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-ink">Organisation</h2>

          {/* Category */}
          <div>
            <Label htmlFor="product-category">
              Category <span className="text-danger">*</span>
            </Label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (fieldErrors.categoryId) {
                  setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
                }
              }}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.categoryId) || undefined}
              className={cn(fieldClasses(Boolean(fieldErrors.categoryId)), 'mt-1.5 h-11')}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} › ` : ''}
                  {c.name}
                  {c.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && <FieldError>{fieldErrors.categoryId}</FieldError>}
          </div>

          {/* Active status switch */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
            <div>
              <p id="product-active-label" className="text-sm font-medium text-ink">
                Storefront Visibility
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {isActive
                  ? 'Active: customers can discover and purchase this product.'
                  : 'Inactive: hidden from public catalog and search.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-labelledby="product-active-label"
              onClick={() => setIsActive((prev) => !prev)}
              disabled={submitting}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-60',
                isActive ? 'bg-accent-600' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 rounded-full bg-white shadow-card transition-transform',
                  isActive ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>

          {/* Audit metadata when editing */}
          {product && (
            <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-ink-muted">Created</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {new Date(product.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Last Updated</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {new Date(product.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          )}
        </AdminPanel>

        {/* Action buttons */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex-col-reverse lg:items-stretch">
          <Link
            href="/admin/products"
            className={buttonClasses({
              variant: 'secondary',
              className: 'sm:min-w-[8rem]',
            })}
          >
            Cancel
          </Link>
          <Button type="submit" disabled={submitting} className="sm:min-w-[8rem]">
            {submitting && <SpinnerIcon className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>
    </form>
  );
}
