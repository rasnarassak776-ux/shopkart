import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  isPresent,
  SLUG_MESSAGE,
  SLUG_PATTERN,
  trimString,
  trimToNull,
} from './create-category.dto';

/** All fields optional; omitted fields are left unchanged, `null` clears nullable fields. */
export class UpdateCategoryDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Category name cannot be empty' })
  @MaxLength(120)
  name?: string;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(140)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string | null;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @Transform(trimToNull)
  @ValidateIf(isPresent)
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
