/**
 * Contracts for the merchant-only catalog API (`/api/v1/catalog/admin/*`)
 * served by apps/catalog-service AdminController.
 */

export interface CatalogAdminStats {
  products: { total: number; active: number; inactive: number };
  categories: { total: number; active: number; inactive: number };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent: { id: string; name: string; isActive: boolean } | null;
  _count: { products: number; children: number };
}

export interface AdminCategoryInput {
  name: string;
  /** Empty/null lets the API derive the slug from the name. */
  slug?: string | null;
  description?: string | null;
  parentId?: string | null;
  isActive?: boolean;
}

export interface AdminProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string | null;
  sku: string;
  description: string | null;
  price: string;
  brand: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
  images: AdminProductImage[];
  primaryImage?: AdminProductImage | null;
}

export interface AdminProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'name' | 'price' | 'sku';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminProductsResponse {
  data: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateAdminProductInput {
  name: string;
  sku: string;
  price: number;
  categoryId: string;
  description?: string | null;
  brand?: string | null;
  slug?: string | null;
  isActive?: boolean;
}

export interface UpdateAdminProductInput {
  name?: string;
  sku?: string;
  price?: number;
  categoryId?: string;
  description?: string | null;
  brand?: string | null;
  slug?: string | null;
  isActive?: boolean;
}

export interface DeleteAdminProductResult {
  success: boolean;
  message: string;
  id: string;
}

