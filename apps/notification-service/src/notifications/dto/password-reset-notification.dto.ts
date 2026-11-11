import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { PasswordResetNotificationPayload } from '@shopkart/common';

export class PasswordResetNotificationDto implements PasswordResetNotificationPayload {
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsNotEmpty()
  resetUrl: string;

  @IsInt()
  @Min(1)
  expiresInMinutes: number;

  @IsString()
  @IsNotEmpty()
  requestedAt: string;
}
