import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() @MaxLength(20) status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsUUID('4') merchantId?: string;
}

export class StockAdjustmentDto {
  @IsOptional() @Type(() => Number) @IsInt() quantity?: number;
  @IsOptional() @Type(() => Number) @IsInt() quantityDelta?: number;
  @IsNotEmpty() @IsString() @MaxLength(500) reason!: string;
}

export class LowStockThresholdDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(1000000) lowStockThreshold!: number;
}

export class StockHistoryQueryDto {
  @IsOptional() @IsUUID('4') productId?: string;
  @IsOptional() @IsUUID('4') merchantId?: string;
  @IsOptional() @IsString() @MaxLength(40) from?: string;
  @IsOptional() @IsString() @MaxLength(40) to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
