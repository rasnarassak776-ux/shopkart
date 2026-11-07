import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity must not exceed 99' })
  quantity: number;
}
