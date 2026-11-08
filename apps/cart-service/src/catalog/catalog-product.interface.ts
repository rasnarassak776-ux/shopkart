export interface CatalogProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText?: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  price: string;
  brand?: string | null;
  isActive: boolean;
  images?: CatalogProductImage[];
}
