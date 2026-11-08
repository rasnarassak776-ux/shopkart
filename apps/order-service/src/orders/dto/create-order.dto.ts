import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('4', { message: 'addressId must be a valid UUID' })
  @IsNotEmpty({ message: 'addressId is required' })
  addressId: string;

  @IsIn(['COD'], { message: 'paymentMethod must be COD' })
  @IsNotEmpty({ message: 'paymentMethod is required' })
  paymentMethod: 'COD';
}
