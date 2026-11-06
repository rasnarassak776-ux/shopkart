import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateAddressDto {
  @IsOptional()
  @IsString({ message: 'Full name must be a string.' })
  @MaxLength(120, { message: 'Full name must not exceed 120 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string.' })
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, {
    message: 'Phone number format is invalid.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Address line 1 must be a string.' })
  @MaxLength(255, { message: 'Address line 1 must not exceed 255 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  addressLine1?: string;

  @IsOptional()
  @IsString({ message: 'Address line 2 must be a string.' })
  @MaxLength(255, { message: 'Address line 2 must not exceed 255 characters.' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined,
  )
  addressLine2?: string;

  @IsOptional()
  @IsString({ message: 'City must be a string.' })
  @MaxLength(100, { message: 'City must not exceed 100 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city?: string;

  @IsOptional()
  @IsString({ message: 'State must be a string.' })
  @MaxLength(100, { message: 'State must not exceed 100 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  state?: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a string.' })
  @MaxLength(15, { message: 'Postal code must not exceed 15 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  postalCode?: string;

  @IsOptional()
  @IsString({ message: 'Country must be a string.' })
  @MaxLength(80, { message: 'Country must not exceed 80 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  country?: string;

  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean.' })
  isDefault?: boolean;
}
