import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  isPresent,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  trimString,
  trimToNull,
} from '../../categories/dto/create-category.dto';

export class CreateProductDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(180)
  name!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  @MaxLength(80)
  sku!: string;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a valid number' })
  @IsPositive({ message: 'Price must be positive' })
  price!: number;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(100)
  brand?: string | null;

  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId!: string;

  /**
   * Owning merchant for the product. Honoured only for superadmin callers;
   * merchants always own the products they create and this field is ignored
   * for them.
   */
  @IsOptional()
  @IsUUID('4', { message: 'merchantId must be a valid UUID' })
  merchantId?: string;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

