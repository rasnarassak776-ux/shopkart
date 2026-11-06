import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Reset token is required.' })
  @IsString({ message: 'Reset token must be a string.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  token: string;

  @IsNotEmpty({ message: 'New password is required.' })
  @IsString({ message: 'New password must be a string.' })
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'New password must contain at least one uppercase letter, one lowercase letter, and one number.',
  })
  newPassword: string;
}
