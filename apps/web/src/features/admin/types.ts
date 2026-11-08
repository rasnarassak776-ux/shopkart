/**
 * Contracts for the admin-only catalog API (`/api/v1/catalog/admin/*`)
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
