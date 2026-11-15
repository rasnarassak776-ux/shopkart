import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRazorpayOrderDto {
  /**
   * Required when creating a brand-new order. Omit when retrying payment
   * for an existing order via `orderId`.
   */
  @IsOptional()
  @IsUUID('4', { message: 'addressId must be a valid UUID' })
  addressId?: string;

  /**
   * Existing internal order to (re)generate a Razorpay order for.
   * Used for safe payment retries without duplicating orders.
   */
  @IsOptional()
  @IsUUID('4', { message: 'orderId must be a valid UUID' })
  orderId?: string;
}

export class VerifyRazorpayPaymentDto {
  @IsUUID('4', { message: 'orderId must be a valid UUID' })
  @IsNotEmpty({ message: 'orderId is required' })
  orderId: string;

  @IsString()
  @IsNotEmpty({ message: 'razorpayOrderId is required' })
  razorpayOrderId: string;

  @IsString()
  @IsNotEmpty({ message: 'razorpayPaymentId is required' })
  razorpayPaymentId: string;

  @IsString()
  @IsNotEmpty({ message: 'razorpaySignature is required' })
  razorpaySignature: string;
}
