'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminErrorState, AdminPanel } from '@/components/admin';
import { Button, buttonClasses, FieldError, FieldHint, fieldClasses, Input, Label, SpinnerIcon } from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { createAdminCategory, updateAdminCategory } from './admin-catalog-api';
import { getDescendantIds, SLUG_PATTERN, slugify } from './category-utils';
import type { AdminCategory, AdminCategoryInput } from './types';

interface CategoryFormProps {
  /** Existing category when editing; omitted when creating. */
  category?: AdminCategory;
  /** All categories, used for the parent selector. */
  categories: AdminCategory[];
}

type FieldErrors = Partial<Record<'name' | 'slug' | 'description', string>>;

export function CategoryForm({ category, categories }: CategoryFormProps) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parentOptions = useMemo(() => {
    const excluded = category ? getDescendantIds(categories, category.id) : new Set<string>();
    return categories.filter((c) => !excluded.has(c.id));
  }, [categories, category]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Category name is required.';
    else if (name.trim().length > 120) errors.name = 'Name must be 120 characters or fewer.';
    else if (!slug.trim() && !slugify(name)) errors.slug = 'Enter a slug — one cannot be generated from this name.';
    if (slug.trim() && !SLUG_PATTERN.test(slug.trim())) {
      errors.slug = 'Use lowercase letters, numbers and single hyphens only.';
    }
    if (description.length > 1000) errors.description = 'Description must be 1000 characters or fewer.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    const payload: AdminCategoryInput = {
      name: name.trim(),
      slug: slug.trim() || null,
      description: description.trim() || null,
      parentId: parentId || null,
      isActive,
    };

    setSubmitting(true);
    try {
      if (category) await updateAdminCategory(category.id, payload);
      else await createAdminCategory(payload);
      router.push(`/admin/categories?saved=${isEdit ? 'updated' : 'created'}`);
    } catch (err) {
      setServerError(err instanceof ApiError || err instanceof Error ? err.message : 'Unable to save the category.');
      setSubmitting(false);
    }
  };

  const slugPreview = slug.trim() || slugify(name);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {serverError && <AdminErrorState message={serverError} />}

        <AdminPanel className="space-y-5 p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-ink">Details</h2>

          <div>
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              invalid={Boolean(fieldErrors.name)}
              maxLength={120}
              disabled={submitting}
              className="mt-1.5"
              placeholder="e.g. Electronics"
              autoFocus={!isEdit}
            />
            {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
          </div>

          <div>
            <Label htmlFor="category-slug">URL slug</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                if (fieldErrors.slug) setFieldErrors((prev) => ({ ...prev, slug: undefined }));
              }}
              invalid={Boolean(fieldErrors.slug)}
              maxLength={140}
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
                    Storefront URL segment: <span className="font-medium text-ink-secondary">/{slugPreview}</span>
                    {!slug.trim() && ' (generated from the name)'}
                  </>
                ) : (
                  'Leave blank to generate from the name.'
                )}
              </FieldHint>
            )}
          </div>

          <div>
            <Label htmlFor="category-description">Description</Label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1000}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.description) || undefined}
              className={cn(fieldClasses(Boolean(fieldErrors.description)), 'mt-1.5 resize-y')}
              placeholder="Optional short description shown to customers"
            />
            {fieldErrors.description ? (
              <FieldError>{fieldErrors.description}</FieldError>
            ) : (
              <FieldHint>{description.length}/1000 characters</FieldHint>
            )}
          </div>
        </AdminPanel>
      </div>

      <div className="space-y-6">
        <AdminPanel className="space-y-5 p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-ink">Organisation</h2>

          <div>
            <Label htmlFor="category-parent">Parent category</Label>
            <select
              id="category-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={submitting}
              className={cn(fieldClasses(), 'mt-1.5 h-11')}
            >
              <option value="">None (top-level category)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.parent ? `${option.parent.name} › ` : ''}
                  {option.name}
                  {option.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
            {isEdit && <FieldHint>A category cannot be placed under itself or its subcategories.</FieldHint>}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-line p-4">
            <div>
              <p id="category-active-label" className="text-sm font-medium text-ink">Visible on storefront</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {isActive ? 'Customers can browse this category.' : 'Hidden from customers.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-labelledby="category-active-label"
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

          {category && (
            <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-ink-muted">Products</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{category._count.products}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Subcategories</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{category._count.children}</dd>
              </div>
            </dl>
          )}
        </AdminPanel>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex-col-reverse lg:items-stretch">
          <Link href="/admin/categories" className={buttonClasses({ variant: 'secondary', className: 'sm:min-w-[8rem]' })}>
            Cancel
          </Link>
          <Button type="submit" disabled={submitting} className="sm:min-w-[8rem]">
            {submitting && <SpinnerIcon className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </div>
    </form>
  );
}
