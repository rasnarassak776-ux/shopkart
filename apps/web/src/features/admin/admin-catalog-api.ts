import { apiClient } from '@/lib/api-client';
import { CATALOG_API_URL } from '@/features/catalog/catalog-api';
import type {
  AdminCategory,
  AdminCategoryInput,
  AdminProduct,
  AdminProductImage,
  AdminProductsQuery,
  AdminProductsResponse,
  CatalogAdminStats,
  CreateAdminProductInput,
  DeleteAdminProductResult,
  UpdateAdminProductInput,
} from './types';

/**
 * Admin catalog endpoints. All calls go through the centralized apiClient, which
 * attaches the in-memory access token and transparently refreshes on 401.
 * The catalog service enforces JWT + admin role on every route server-side.
 */
const ADMIN_BASE = `${CATALOG_API_URL}/api/v1/catalog/admin`;

// ---------------- Admin Stats ----------------

export function getAdminCatalogStats(init?: RequestInit): Promise<CatalogAdminStats> {
  return apiClient<CatalogAdminStats>(`${ADMIN_BASE}/stats`, init);
}

// ---------------- Admin Categories ----------------

export function getAdminCategories(init?: RequestInit): Promise<AdminCategory[]> {
  return apiClient<AdminCategory[]>(`${ADMIN_BASE}/categories`, init);
}

export function getAdminCategory(id: string, init?: RequestInit): Promise<AdminCategory> {
  return apiClient<AdminCategory>(`${ADMIN_BASE}/categories/${encodeURIComponent(id)}`, init);
}

export function createAdminCategory(input: AdminCategoryInput): Promise<AdminCategory> {
  return apiClient<AdminCategory>(`${ADMIN_BASE}/categories`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminCategory(id: string, input: Partial<AdminCategoryInput>): Promise<AdminCategory> {
  return apiClient<AdminCategory>(`${ADMIN_BASE}/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function setAdminCategoryStatus(id: string, isActive: boolean): Promise<AdminCategory> {
  return apiClient<AdminCategory>(`${ADMIN_BASE}/categories/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

// ---------------- Admin Products ----------------

export function getAdminProducts(
  params?: AdminProductsQuery,
  init?: RequestInit,
): Promise<AdminProductsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (typeof params?.isActive === 'boolean') query.set('isActive', String(params.isActive));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const url = qs ? `${ADMIN_BASE}/products?${qs}` : `${ADMIN_BASE}/products`;
  return apiClient<AdminProductsResponse>(url, init);
}

export function getAdminProduct(id: string, init?: RequestInit): Promise<AdminProduct> {
  return apiClient<AdminProduct>(`${ADMIN_BASE}/products/${encodeURIComponent(id)}`, init);
}

export function createAdminProduct(input: CreateAdminProductInput): Promise<AdminProduct> {
  return apiClient<AdminProduct>(`${ADMIN_BASE}/products`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAdminProduct(
  id: string,
  input: UpdateAdminProductInput,
): Promise<AdminProduct> {
  return apiClient<AdminProduct>(`${ADMIN_BASE}/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function setAdminProductStatus(id: string, isActive: boolean): Promise<AdminProduct> {
  return apiClient<AdminProduct>(`${ADMIN_BASE}/products/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export function deleteAdminProduct(id: string): Promise<DeleteAdminProductResult> {
  return apiClient<DeleteAdminProductResult>(`${ADMIN_BASE}/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ---------------- Product Images ----------------

export function uploadProductImages(
  productId: string,
  formData: FormData,
): Promise<AdminProductImage[]> {
  return apiClient<AdminProductImage[]>(
    `${ADMIN_BASE}/products/${encodeURIComponent(productId)}/images`,
    {
      method: 'POST',
      body: formData,
    },
  );
}

export function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<{ success: boolean; message: string; imageId: string }> {
  return apiClient<{ success: boolean; message: string; imageId: string }>(
    `${ADMIN_BASE}/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
    {
      method: 'DELETE',
    },
  );
}

export function setPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<AdminProductImage> {
  return apiClient<AdminProductImage>(
    `${ADMIN_BASE}/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}/primary`,
    {
      method: 'PATCH',
    },
  );
}

