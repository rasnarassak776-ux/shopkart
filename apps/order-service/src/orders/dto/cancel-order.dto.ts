import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum CancellationReason {
  CHANGED_MIND = 'CHANGED_MIND',
  FOUND_BETTER_PRICE = 'FOUND_BETTER_PRICE',
  DELIVERY_TOO_SLOW = 'DELIVERY_TOO_SLOW',
  ITEM_UNAVAILABLE = 'ITEM_UNAVAILABLE',
  ORDER_PLACED_BY_MISTAKE = 'ORDER_PLACED_BY_MISTAKE',
  OTHER = 'OTHER',
}

export class CancelOrderDto {
  @IsNotEmpty({ message: 'reason is required' })
  @IsEnum(CancellationReason, {
    message: `reason must be one of: ${Object.values(CancellationReason).join(', ')}`,
  })
  reason: CancellationReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
