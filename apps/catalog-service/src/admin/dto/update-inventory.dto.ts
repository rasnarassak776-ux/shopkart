import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInventoryDto {
  @Type(() => Number)
  @IsInt({ message: 'availableQuantity must be an integer' })
  @Min(0, { message: 'availableQuantity must be zero or greater' })
  availableQuantity!: number;
}
