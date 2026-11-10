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
import { UserRole } from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthClient, AddressSnapshot } from '../clients/auth.client';
import { CartClient } from '../clients/cart.client';
import { CatalogClient } from '../clients/catalog.client';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
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
      merchantId: string | null;
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

      let merchantId = product.merchantId ?? null;
      if (!merchantId && this.prisma.product) {
        const localProd = await this.prisma.product.findUnique({
          where: { id: product.id },
          select: { merchantId: true },
        });
        merchantId = localProd?.merchantId ?? null;
      }

      const unitPrice = new Prisma.Decimal(product.price);
      const lineTotal = unitPrice.mul(new Prisma.Decimal(item.quantity));

      verifiedItems.push({
        productId: product.id,
        merchantId,
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

        // Create Order Items with immutable merchantId snapshot
        for (const item of verifiedItems) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              merchantId: item.merchantId,
              productNameSnapshot: item.name.substring(0, 180),
              quantity: item.quantity,
              unitPriceSnapshot: item.unitPrice,
              status: OrderStatus.PENDING,
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

  // ---------------- Merchant / Superadmin Order Management ----------------

  private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  /**
   * Console callers: merchants see only orders containing their own products
   * (items filtered to theirs at the order-item level); superadmins see all.
   */
  private assertConsoleRole(role: string) {
    if (role !== UserRole.MERCHANT && role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
  }

  private async getMerchantProductIds(merchantId: string): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { merchantId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Filter and recalculate order for a specific merchant so no private items,
   * totals, or foreign product details are ever leaked.
   */
  private filterOrderForMerchant(order: any, merchantId: string, merchantProductIds: string[]): any {
    const ownedProductSet = new Set(merchantProductIds);
    const merchantItems = (order.items || []).filter(
      (item: any) => item.merchantId === merchantId || ownedProductSet.has(item.productId),
    );

    if (merchantItems.length === 0) {
      return null;
    }

    // Recalculate merchant subtotal from their own items only
    const merchantSubtotal = merchantItems.reduce(
      (acc: Prisma.Decimal, it: any) =>
        acc.add(new Prisma.Decimal(it.unitPriceSnapshot).mul(new Prisma.Decimal(it.quantity))),
      new Prisma.Decimal(0),
    );

    // Filter status history to order-level or this merchant's updates
    const filteredHistory = (order.statusHistory || []).filter(
      (h: any) => !h.merchantId || h.merchantId === merchantId,
    );

    // Compute merchant's specific item fulfillment status
    const merchantItemStatuses = merchantItems.map((i: any) => i.status || order.status);
    const allSameStatus = merchantItemStatuses.every((s: any) => s === merchantItemStatuses[0]);
    const merchantStatus = allSameStatus ? merchantItemStatuses[0] : order.status;

    return {
      ...order,
      status: merchantStatus,
      totalAmount: merchantSubtotal,
      itemCount: merchantItems.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0),
      items: merchantItems,
      statusHistory: filteredHistory,
    };
  }

  async getMerchantOrders(
    actor: { id: string; role: string },
    query: QueryOrdersDto,
  ): Promise<PaginatedOrdersResponse> {
    this.assertConsoleRole(actor.role);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const isSuperadmin = actor.role === UserRole.SUPERADMIN;
    const targetMerchantId = isSuperadmin ? query.merchantId : actor.id;

    let merchantProductIds: string[] = [];
    if (targetMerchantId) {
      merchantProductIds = await this.getMerchantProductIds(targetMerchantId);
    }

    const searchTrimmed = query.search?.trim();
    const isSearchUuid = Boolean(
      searchTrimmed &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTrimmed),
    );

    const where: Prisma.OrderWhereInput = {
      ...(isSearchUuid ? { id: searchTrimmed } : {}),
      ...(targetMerchantId
        ? {
            items: {
              some: {
                OR: [
                  { merchantId: targetMerchantId },
                  ...(merchantProductIds.length > 0 ? [{ productId: { in: merchantProductIds } }] : []),
                ],
                ...(query.status ? { status: query.status } : {}),
              },
            },
          }
        : query.status
          ? { status: query.status }
          : {}),
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

    const formattedData = orders.map((order) => {
      if (!isSuperadmin) {
        const filtered = this.filterOrderForMerchant(order, actor.id, merchantProductIds);
        return this.formatOrderResponse(filtered || order, true);
      }
      return this.formatOrderResponse(order);
    });

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getMerchantOrderById(
    actor: { id: string; role: string },
    orderId: string,
  ): Promise<OrderResponse> {
    this.assertConsoleRole(actor.role);

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

    if (actor.role === UserRole.MERCHANT) {
      const merchantProductIds = await this.getMerchantProductIds(actor.id);
      const filtered = this.filterOrderForMerchant(order, actor.id, merchantProductIds);
      if (!filtered) {
        throw new NotFoundException('Order not found');
      }
      return this.formatOrderResponse(filtered, true);
    }

    return this.formatOrderResponse(order);
  }

  async updateMerchantOrderStatus(
    actor: { id: string; role: string },
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    this.assertConsoleRole(actor.role);
    const targetStatus = dto.status;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isSuperadmin = actor.role === UserRole.SUPERADMIN;
    let targetItems: any[] = [];
    let merchantProductIds: string[] = [];

    if (!isSuperadmin) {
      merchantProductIds = await this.getMerchantProductIds(actor.id);
      const ownedProductSet = new Set(merchantProductIds);
      targetItems = (order.items || []).filter(
        (i: any) => i.merchantId === actor.id || ownedProductSet.has(i.productId),
      );

      if (targetItems.length === 0) {
        throw new NotFoundException('Order not found');
      }
    } else {
      targetItems = order.items || [];
    }

    // Check if target items are already at requested status (idempotent request)
    const allAlreadyTarget = targetItems.every((i: any) => (i.status || order.status) === targetStatus);
    if (allAlreadyTarget) {
      return this.getMerchantOrderById(actor, orderId);
    }

    // Validate lifecycle transitions for target items
    for (const item of targetItems) {
      const currentItemStatus = (item.status || order.status) as OrderStatus;
      const validNext = OrdersService.ALLOWED_TRANSITIONS[currentItemStatus] || [];
      if (currentItemStatus !== targetStatus && !validNext.includes(targetStatus)) {
        throw new BadRequestException(
          `Cannot transition item "${item.productNameSnapshot}" from ${currentItemStatus} to ${targetStatus}. Allowed next: ${validNext.length > 0 ? validNext.join(', ') : 'None (Terminal state)'}`,
        );
      }
    }

    const targetItemIds = targetItems.map((i: any) => i.id);
    const targetProductIds = targetItems.map((i: any) => i.productId);

    // Execute atomic update in transaction
    const updatedOrder = await this.prisma.$transaction(
      async (tx) => {
        // 1. Update target items' fulfillment status
        await tx.orderItem.updateMany({
          where: { id: { in: targetItemIds } },
          data: { status: targetStatus },
        });

        // 2. Audit history entry
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            merchantId: !isSuperadmin ? actor.id : null,
            status: targetStatus,
            notes: dto.notes || (!isSuperadmin ? `Updated by merchant ${actor.id}` : 'Updated by superadmin'),
          },
        });

        // 3. Release inventory stock if transitioning to CANCELLED
        if (targetStatus === OrderStatus.CANCELLED) {
          await this.inventoryService.releaseStockForItemsInTx(tx, orderId, targetProductIds);
        }

        // 4. Determine aggregate customer order status across ALL items in this order
        const allOrderItems = await tx.orderItem.findMany({
          where: { orderId },
        });

        const allStatuses = allOrderItems.map((i) => i.status);
        let newAggregateStatus: OrderStatus;

        if (allStatuses.length > 0 && allStatuses.every((s) => s === OrderStatus.DELIVERED)) {
          newAggregateStatus = OrderStatus.DELIVERED;
          await tx.payment.updateMany({
            where: {
              orderId,
              paymentMethod: PaymentMethod.COD,
              paymentStatus: PaymentStatus.COD_PENDING,
            },
            data: {
              paymentStatus: PaymentStatus.COD_COLLECTED,
            },
          });
        } else if (allStatuses.length > 0 && allStatuses.every((s) => s === OrderStatus.CANCELLED)) {
          newAggregateStatus = OrderStatus.CANCELLED;
        } else if (allStatuses.some((s) => s === OrderStatus.SHIPPED)) {
          newAggregateStatus = OrderStatus.SHIPPED;
        } else if (allStatuses.some((s) => s === OrderStatus.PROCESSING)) {
          newAggregateStatus = OrderStatus.PROCESSING;
        } else if (allStatuses.some((s) => s === OrderStatus.CONFIRMED)) {
          newAggregateStatus = OrderStatus.CONFIRMED;
        } else {
          newAggregateStatus = OrderStatus.PENDING;
        }

        if (order.status !== newAggregateStatus) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: newAggregateStatus, updatedAt: new Date() },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId,
              status: newAggregateStatus,
              notes: 'Aggregate order status updated',
            },
          });
        }

        return tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            payments: true,
            statusHistory: { orderBy: { changedAt: 'asc' } },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      },
    );

    if (!isSuperadmin) {
      const filtered = this.filterOrderForMerchant(updatedOrder, actor.id, merchantProductIds);
      return this.formatOrderResponse(filtered || updatedOrder, true);
    }

    return this.formatOrderResponse(updatedOrder);
  }

  // Backwards compatible aliases for existing console callers
  async getConsoleOrders(actor: { id: string; role: string }, query: QueryOrdersDto) {
    return this.getMerchantOrders(actor, query);
  }

  async getConsoleOrderById(actor: { id: string; role: string }, orderId: string) {
    return this.getMerchantOrderById(actor, orderId);
  }

  async updateConsoleOrderStatus(actor: { id: string; role: string }, orderId: string, status: OrderStatus, notes?: string) {
    return this.updateMerchantOrderStatus(actor, orderId, { status, notes });
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

  private formatOrderResponse(order: any, merchantView = false): OrderResponse {
    const payment = order.payments && order.payments.length > 0 ? order.payments[0] : null;

    const items: OrderItemResponse[] = (order.items || []).map((item: any) => {
      const unitPrice = new Prisma.Decimal(item.unitPriceSnapshot || item.unitPrice || 0);
      const lineTotal = unitPrice.mul(new Prisma.Decimal(item.quantity || 1));
      return {
        id: item.id,
        productId: item.productId,
        merchantId: item.merchantId,
        name: item.productNameSnapshot || item.name || '',
        productNameSnapshot: item.productNameSnapshot || item.name || '',
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        unitPriceSnapshot: unitPrice.toFixed(2),
        totalPrice: lineTotal.toFixed(2),
        status: item.status || order.status,
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
      totalAmount: new Prisma.Decimal(order.totalAmount || 0).toFixed(2),
      currency: 'INR',
      itemCount: totalItemCount,
      addressSnapshot: order.addressSnapshot,
      items,
      payment: payment
        ? {
            paymentMethod: payment.paymentMethod,
            paymentStatus: payment.paymentStatus,
            amount: merchantView
              ? new Prisma.Decimal(order.totalAmount || 0).toFixed(2)
              : new Prisma.Decimal(payment.amount || 0).toFixed(2),
            idempotencyKey: payment.idempotencyKey,
          }
        : undefined,
      statusHistory: (order.statusHistory || []).map((h: any) => ({
        id: h.id,
        merchantId: h.merchantId,
        notes: h.notes,
        status: h.status,
        changedAt: h.changedAt ? new Date(h.changedAt).toISOString() : new Date().toISOString(),
      })),
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: order.updatedAt ? new Date(order.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}
