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

export const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Empty strings are normalised to null so optional text fields can be cleared. */
export const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const isPresent = (_: object, value: unknown) =>
  value !== null && value !== undefined;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MESSAGE =
  'Slug may only contain lowercase letters, numbers and single hyphens';

export class CreateCategoryDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MaxLength(120)
  name!: string;

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
