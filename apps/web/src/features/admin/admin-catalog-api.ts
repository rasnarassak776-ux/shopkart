import { apiClient } from '@/lib/api-client';
import { CATALOG_API_URL } from '@/features/catalog/catalog-api';
import type { AdminCategory, AdminCategoryInput, CatalogAdminStats } from './types';

/**
 * Admin catalog endpoints. All calls go through the centralized apiClient, which
 * attaches the in-memory access token and transparently refreshes on 401.
 * The catalog service enforces JWT + admin role on every route server-side.
 */
const ADMIN_BASE = `${CATALOG_API_URL}/api/v1/catalog/admin`;

export function getAdminCatalogStats(init?: RequestInit): Promise<CatalogAdminStats> {
  return apiClient<CatalogAdminStats>(`${ADMIN_BASE}/stats`, init);
}

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
