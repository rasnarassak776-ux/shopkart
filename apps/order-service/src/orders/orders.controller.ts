import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
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

  @Get()
  async getCustomerOrders(
    @CurrentUser('id') userId: string,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.getCustomerOrders(userId, query);
  }

  @Get('my-orders')
  async getMyOrdersAlias(
    @CurrentUser('id') userId: string,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.getCustomerOrders(userId, query);
  }

  // ---------------- Merchant / Superadmin console ----------------
  // Declared before `:id` so the literal `admin` segment is not captured as an id.

  @Get('admin')
  async getConsoleOrders(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.getConsoleOrders(user, query);
  }

  @Get('admin/:id')
  async getConsoleOrderById(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getConsoleOrderById(user, id);
  }

  @Patch('admin/:id/status')
  async updateConsoleOrderStatus(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status?: OrderStatus },
  ) {
    if (!body?.status || !Object.values(OrderStatus).includes(body.status)) {
      throw new BadRequestException(
        `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
      );
    }
    return this.ordersService.updateConsoleOrderStatus(user, id, body.status);
  }

  @Get(':id')
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderById(userId, id);
  }
}
