import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const ADMIN_PRODUCT_SORT_FIELDS = [
  'createdAt',
  'name',
  'price',
  'sku',
] as const;
export type AdminProductSortField = (typeof ADMIN_PRODUCT_SORT_FIELDS)[number];

export const ADMIN_PRODUCT_SORT_ORDERS = ['asc', 'desc'] as const;
export type AdminProductSortOrder = (typeof ADMIN_PRODUCT_SORT_ORDERS)[number];

export class QueryAdminProductsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  /** Superadmin-only filter: restrict the listing to one merchant's products. */
  @IsUUID('4')
  @IsOptional()
  merchantId?: string;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  isActive?: boolean;

  @IsIn(ADMIN_PRODUCT_SORT_FIELDS)
  @IsOptional()
  sortBy?: AdminProductSortField = 'createdAt';

  @IsIn(ADMIN_PRODUCT_SORT_ORDERS)
  @IsOptional()
  sortOrder?: AdminProductSortOrder = 'desc';
}

