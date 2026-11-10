'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminErrorState, AdminNotice, AdminPageHeader } from '@/components/admin';
import { buttonClasses, Skeleton, TagIcon } from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { getAdminCategories, getAdminCategory } from './admin-catalog-api';
import { CategoryForm } from './category-form';
import type { AdminCategory } from './types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; category?: AdminCategory; categories: AdminCategory[] };

/** Loads data for the create (`categoryId` omitted) or edit category form. */
export function CategoryEditor({ categoryId }: { categoryId?: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const [categories, category] = await Promise.all([
        getAdminCategories(),
        categoryId ? getAdminCategory(categoryId) : Promise.resolve(undefined),
      ]);
      setState({ status: 'ready', categories, category });
    } catch (err) {
      const notFound = err instanceof ApiError && (err.status === 404 || err.status === 400);
      setState({
        status: 'error',
        notFound,
        message: err instanceof Error ? err.message : 'Unable to load category data.',
      });
    }
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const isEdit = Boolean(categoryId);
  const title = isEdit
    ? state.status === 'ready' && state.category
      ? `Edit “${state.category.name}”`
      : 'Edit category'
    : 'New category';

  return (
    <>
      <AdminPageHeader
        title={title}
        description={isEdit ? 'Update category details, hierarchy and storefront visibility.' : 'Add a category to organise the storefront catalog.'}
      />

      {state.status === 'loading' && (
        <div className="grid gap-6 lg:grid-cols-3" aria-label="Loading">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      )}

      {state.status === 'error' &&
        (state.notFound ? (
          <AdminNotice
            icon={TagIcon}
            title="Category not found"
            description="This category does not exist or may have been removed."
            action={
              <Link href="/merchant/categories" className={buttonClasses({ size: 'sm' })}>
                Back to categories
              </Link>
            }
          />
        ) : (
          <AdminErrorState message={state.message} onRetry={load} />
        ))}

      {state.status === 'ready' && <CategoryForm category={state.category} categories={state.categories} />}
    </>
  );
}
