import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string.' })
  @MinLength(1, { message: 'Name must not be empty.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string.' })
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, {
    message: 'Phone number format is invalid.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined,
  )
  phone?: string;
}
