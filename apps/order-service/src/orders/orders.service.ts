import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthClient, AddressSnapshot } from '../clients/auth.client';
import { CartClient } from '../clients/cart.client';
import { CatalogClient } from '../clients/catalog.client';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import {
  OrderItemResponse,
  OrderResponse,
  PaginatedOrdersResponse,
} from './interfaces/order-response.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authClient: AuthClient,
    private readonly cartClient: CartClient,
    private readonly catalogClient: CatalogClient,
    private readonly inventoryService: InventoryService,
  ) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey: string,
    authToken?: string,
  ): Promise<OrderResponse> {
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const trimmedKey = idempotencyKey.trim();

    // 1. Idempotency Check: return existing order if key matches
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: trimmedKey },
      include: {
        order: {
          include: {
            items: true,
            payments: true,
            statusHistory: { orderBy: { changedAt: 'asc' } },
          },
        },
      },
    });

    if (existingPayment && existingPayment.order) {
      if (existingPayment.order.userId !== userId) {
        throw new ForbiddenException('Order does not belong to you');
      }
      this.logger.log(
        `Idempotent replay: returning existing order ${existingPayment.order.id} for key ${trimmedKey}`,
      );
      return this.formatOrderResponse(existingPayment.order);
    }

    // 2. Validate delivery address ownership and format snapshot
    const addressSnapshot: AddressSnapshot = await this.authClient.getAddressSnapshot(
      userId,
      dto.addressId,
      authToken,
    );

    // 3. Fetch active cart items for the user
    const cart = authToken
      ? await this.cartClient.getCart(authToken)
      : await this.getLocalActiveCart(userId);

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot place an order with an empty cart');
    }

    // 4. Validate all cart items with authoritative Catalog Service prices and status
    const verifiedItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }> = [];

    let totalAmount = new Prisma.Decimal(0);

    for (const item of cart.items) {
      const product = await this.catalogClient.getProduct(item.productId);
      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Product "${item.name || item.productId}" is no longer available`,
        );
      }

      const unitPrice = new Prisma.Decimal(product.price);
      const lineTotal = unitPrice.mul(new Prisma.Decimal(item.quantity));

      verifiedItems.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });

      totalAmount = totalAmount.add(lineTotal);
    }

    if (verifiedItems.length === 0) {
      throw new BadRequestException('No valid items found in cart');
    }

    // 5. Execute atomic transaction: Reserve Inventory + Create Order + OrderItems + Payment + History
    const createdOrder = await this.prisma.$transaction(
      async (tx) => {
        // Create Order header
        const order = await tx.order.create({
          data: {
            userId,
            addressSnapshot: addressSnapshot as any,
            totalAmount,
            status: OrderStatus.PENDING,
          },
        });

        // Create Order Items
        for (const item of verifiedItems) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              productNameSnapshot: item.name.substring(0, 180),
              quantity: item.quantity,
              unitPriceSnapshot: item.unitPrice,
            },
          });
        }

        // Create COD Payment
        await tx.payment.create({
          data: {
            orderId: order.id,
            paymentMethod: PaymentMethod.COD,
            paymentStatus: PaymentStatus.COD_PENDING,
            amount: totalAmount,
            idempotencyKey: trimmedKey,
          },
        });

        // Record initial status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.PENDING,
          },
        });

        // Atomically reserve inventory within the transaction
        await this.inventoryService.reserveStockInTx(
          tx,
          order.id,
          verifiedItems.map((i) => ({
            productId: i.productId,
            productName: i.name,
            quantity: i.quantity,
          })),
        );

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );

    // 6. Convert cart so it cannot be reused
    if (authToken) {
      try {
        await this.cartClient.convertCart(authToken);
      } catch (err: any) {
        this.logger.warn(`Failed to notify cart conversion: ${err.message}`);
      }
    } else {
      await this.markLocalCartConverted(userId);
    }

    // 7. Load complete order and return response
    const completeOrder = await this.prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: {
        items: true,
        payments: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    this.logger.log(`Order ${createdOrder.id} successfully placed for user ${userId}`);
    return this.formatOrderResponse(completeOrder!);
  }

  async getCustomerOrders(
    userId: string,
    query: QueryOrdersDto,
  ): Promise<PaginatedOrdersResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
          statusHistory: { orderBy: { changedAt: 'asc' } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: orders.map((order) => this.formatOrderResponse(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getOrderById(userId: string, orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return this.formatOrderResponse(order);
  }

  private async getLocalActiveCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { items: true },
    });

    if (!cart) return null;

    return {
      cartId: cart.id,
      items: cart.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        name: 'Item',
        quantity: i.quantity,
        unitPrice: '0.00',
        lineTotal: '0.00',
        available: true,
      })),
      summary: { totalItems: cart.items.length, availableItems: cart.items.length, subtotal: '0.00' },
    };
  }

  private async markLocalCartConverted(userId: string) {
    await this.prisma.cart.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CONVERTED' },
    });
  }

  private formatOrderResponse(order: any): OrderResponse {
    const payment = order.payments && order.payments.length > 0 ? order.payments[0] : null;

    const items: OrderItemResponse[] = (order.items || []).map((item: any) => {
      const unitPrice = new Prisma.Decimal(item.unitPriceSnapshot);
      const lineTotal = unitPrice.mul(new Prisma.Decimal(item.quantity));
      return {
        id: item.id,
        productId: item.productId,
        name: item.productNameSnapshot,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: lineTotal.toFixed(2),
      };
    });

    const totalItemCount = (order.items || []).reduce(
      (sum: number, item: any) => sum + (item.quantity || 0),
      0,
    );

    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: new Prisma.Decimal(order.totalAmount).toFixed(2),
      currency: 'INR',
      itemCount: totalItemCount,
      addressSnapshot: order.addressSnapshot,
      items,
      payment: payment
        ? {
            paymentMethod: payment.paymentMethod,
            paymentStatus: payment.paymentStatus,
            amount: new Prisma.Decimal(payment.amount).toFixed(2),
            idempotencyKey: payment.idempotencyKey,
          }
        : undefined,
      statusHistory: (order.statusHistory || []).map((h: any) => ({
        status: h.status,
        changedAt: h.changedAt ? new Date(h.changedAt).toISOString() : new Date().toISOString(),
      })),
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}
