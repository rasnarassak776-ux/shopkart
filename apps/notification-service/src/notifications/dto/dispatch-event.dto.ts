import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { NotificationType } from '@shopkart/common';

export class DispatchEventDto {
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;
}
