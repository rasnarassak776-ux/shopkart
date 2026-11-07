import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PRODUCT_SORT_FIELDS = ['price', 'name', 'createdAt'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export const PRODUCT_SORT_ORDERS = ['asc', 'desc'] as const;
export type ProductSortOrder = (typeof PRODUCT_SORT_ORDERS)[number];

export class QueryProductsDto {
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
  limit?: number = 12;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @IsIn(PRODUCT_SORT_FIELDS)
  @IsOptional()
  sortBy?: ProductSortField;

  @IsIn(PRODUCT_SORT_ORDERS)
  @IsOptional()
  sortOrder?: ProductSortOrder;
}
