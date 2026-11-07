import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKeyHeader: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ordersService.createOrder(
      userId,
      dto,
      idempotencyKeyHeader,
      authHeader,
    );
  }

  @Get(':id')
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderById(userId, id);
  }
}
