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

export class UpdateProductDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  @MaxLength(180)
  name?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'SKU cannot be empty' })
  @MaxLength(80)
  sku?: string;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a valid number' })
  @IsPositive({ message: 'Price must be positive' })
  price?: number;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(100)
  brand?: string | null;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

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

export class UpdateProductStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

