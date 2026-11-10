import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Editable merchant details. Role and password are intentionally not updatable here. */
export class UpdateMerchantDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string.' })
  @MinLength(1, { message: 'Name must not be empty.' })
  @MaxLength(120, { message: 'Name must be at most 120 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @MaxLength(255, { message: 'Email must be at most 255 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email?: string;

  /** An empty string clears the phone number. */
  @IsOptional()
  @IsString({ message: 'Phone must be a string.' })
  @Matches(/^$|^\+?[0-9\s\-()]{7,20}$/, { message: 'Phone number format is invalid.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;
}

export class UpdateMerchantStatusDto {
  @IsBoolean({ message: 'isActive must be a boolean.' })
  isActive: boolean;
}
