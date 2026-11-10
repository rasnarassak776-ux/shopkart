import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Payload for creating a merchant. There is deliberately no role field: the
 * service always assigns `merchant`, and the global ValidationPipe
 * (forbidNonWhitelisted) rejects any extra `role`/`roleId` property.
 */
export class CreateMerchantDto {
  @IsNotEmpty({ message: 'Name must not be empty.' })
  @IsString({ message: 'Name must be a string.' })
  @MaxLength(120, { message: 'Name must be at most 120 characters.' })
  @Transform(trim)
  name: string;

  @IsNotEmpty({ message: 'Email must not be empty.' })
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @MaxLength(255, { message: 'Email must be at most 255 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsNotEmpty({ message: 'Password must not be empty.' })
  @IsString({ message: 'Password must be a string.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/, {
    message:
      'Merchant passwords must be 12-128 characters and include upper-case, lower-case, a number and a symbol.',
  })
  password: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string.' })
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'Phone number format is invalid.' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined,
  )
  phone?: string;
}
