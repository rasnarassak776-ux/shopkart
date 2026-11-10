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
import { UserRole } from '@shopkart/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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

  // ---------------- Merchant Order Management ----------------
  // Declared before `:id` to prevent route collision with customer :id

  @Get('merchant')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
  async getMerchantOrders(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.getMerchantOrders(user, query);
  }

  @Get('merchant/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
  async getMerchantOrderById(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getMerchantOrderById(user, id);
  }

  @Patch('merchant/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
  async updateMerchantOrderStatus(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateMerchantOrderStatus(user, id, body);
  }

  // ---------------- Superadmin / Admin Console Aliases ----------------

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
  async getConsoleOrders(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.getMerchantOrders(user, query);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
  async getConsoleOrderById(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getMerchantOrderById(user, id);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.SUPERADMIN)
  async updateConsoleOrderStatus(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateMerchantOrderStatus(user, id, body);
  }

  // ---------------- Customer Order Details ----------------

  @Get(':id')
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getOrderById(userId, id);
  }
}
