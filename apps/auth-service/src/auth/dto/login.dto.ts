import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsNotEmpty({ message: 'Email must not be empty.' })
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsNotEmpty({ message: 'Password must not be empty.' })
  @IsString({ message: 'Password must be a string.' })
  password: string;
}
