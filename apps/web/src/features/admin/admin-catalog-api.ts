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
 * Merchant catalog endpoints. All calls go through the centralized apiClient, which
 * attaches the in-memory access token and transparently refreshes on 401.
 * The catalog service enforces JWT + merchant role on every route server-side.
 */
const ADMIN_BASE = `${CATALOG_API_URL}/api/v1/catalog/admin`;

// ---------------- Merchant Stats ----------------

export function getAdminCatalogStats(init?: RequestInit): Promise<CatalogAdminStats> {
  return apiClient<CatalogAdminStats>(`${ADMIN_BASE}/stats`, init);
}

// ---------------- Merchant Categories ----------------

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

// ---------------- Merchant Products ----------------

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


// ---------------- Inventory ----------------

export type InventoryStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface AdminInventoryItem {
  productId: string;
  name: string;
  sku: string;
  brand: string | null;
  imageUrl: string | null;
  isActive: boolean;
  outOfStock: boolean;
  merchantId: string | null;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  stockStatus: InventoryStockStatus;
  updatedAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface InventoryListResponse {
  data: AdminInventoryItem[];
  summary: InventorySummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface StockMovement {
  id: string;
  productId: string;
  merchantId: string | null;
  previousQuantity: number;
  quantityChanged: number;
  newQuantity: number;
  actionType: string;
  reason: string | null;
  userId: string | null;
  createdAt: string;
  product?: { id: string; name: string; sku: string; merchantId: string | null } | null;
}

export interface StockHistoryResponse {
  data: StockMovement[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface InventoryQuery {
  page?: number;
  limit?: number;
  status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  search?: string;
  merchantId?: string;
}

function inventoryQueryString(query: InventoryQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.merchantId) params.set('merchantId', query.merchantId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getAdminInventory(query: InventoryQuery = {}, init?: RequestInit): Promise<InventoryListResponse> {
  return apiClient<InventoryListResponse>(`${ADMIN_BASE}/inventory${inventoryQueryString(query)}`, init);
}

export function adjustAdminInventory(productId: string, quantityDelta: number, reason: string) {
  return apiClient<AdminInventoryItem>(`${ADMIN_BASE}/inventory/${encodeURIComponent(productId)}/adjust`, {
    method: 'POST',
    body: JSON.stringify({ quantityDelta, reason }),
  });
}

export function increaseAdminInventory(productId: string, quantity: number, reason: string) {
  return apiClient<AdminInventoryItem>(`${ADMIN_BASE}/inventory/${encodeURIComponent(productId)}/increase`, {
    method: 'POST',
    body: JSON.stringify({ quantity, reason }),
  });
}

export function decreaseAdminInventory(productId: string, quantity: number, reason: string) {
  return apiClient<AdminInventoryItem>(`${ADMIN_BASE}/inventory/${encodeURIComponent(productId)}/decrease`, {
    method: 'POST',
    body: JSON.stringify({ quantity, reason }),
  });
}

export function updateAdminInventoryThreshold(productId: string, lowStockThreshold: number) {
  return apiClient<AdminInventoryItem>(`${ADMIN_BASE}/inventory/${encodeURIComponent(productId)}/threshold`, {
    method: 'PATCH',
    body: JSON.stringify({ lowStockThreshold }),
  });
}

export function getAdminStockHistory(query: { productId?: string; merchantId?: string; from?: string; to?: string; page?: number; limit?: number } = {}): Promise<StockHistoryResponse> {
  const params = new URLSearchParams();
  if (query.productId) params.set('productId', query.productId);
  if (query.merchantId) params.set('merchantId', query.merchantId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiClient<StockHistoryResponse>(`${ADMIN_BASE}/inventory/history${qs ? `?${qs}` : ''}`);
}
