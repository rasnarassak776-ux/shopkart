import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { RazorpayService } from './razorpay.service';
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from './dto/payments.dto';

const TERMINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
  PaymentStatus.REFUND_PENDING,
];

const RETRYABLE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.FAILED,
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly razorpay: RazorpayService,
  ) {}

  // ---------------- Step A: Create Razorpay order ----------------

  /**
   * Creates (or safely retries) a Razorpay order for a Shopkart order.
   *
   * - With `addressId`: builds the internal order through the existing
   *   OrdersService.createOrder pipeline (server-side pricing, inventory
   *   reservation, idempotency) using PaymentMethod.ONLINE.
   * - With `orderId`: retries payment for an existing unpaid ONLINE order
   *   without creating a duplicate order.
   */
  async createRazorpayOrder(
    userId: string,
    dto: CreateRazorpayOrderDto,
    idempotencyKey?: string,
    authToken?: string,
  ) {
    this.razorpayMissingGuard();

    let orderId: string;

    if (dto.orderId) {
      orderId = await this.resolveRetryableOrder(userId, dto.orderId);
    } else {
      if (!dto.addressId) {
        throw new BadRequestException('addressId is required to create a new order');
      }
      if (!idempotencyKey || idempotencyKey.trim().length === 0) {
        throw new BadRequestException('Idempotency-Key header is required');
      }
      const created = await this.ordersService.createOrder(
        userId,
        { addressId: dto.addressId, paymentMethod: 'ONLINE' },
        idempotencyKey.trim(),
        authToken,
      );
      orderId = created.id;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = order.payments.find((p) => p.paymentMethod === PaymentMethod.ONLINE);
    if (!payment) {
      throw new BadRequestException('Order does not have an online payment record');
    }

    if (TERMINAL_PAYMENT_STATUSES.includes(payment.paymentStatus)) {
      throw new ConflictException(`Payment for this order is already ${payment.paymentStatus}`);
    }

    // Idempotent: reuse an existing Razorpay order for this payment attempt.
    let razorpayOrderId = payment.razorpayOrderId;
    if (!razorpayOrderId) {
      const amountPaise = this.toPaise(payment.amount);
      const rzOrder = await this.razorpay.createOrder({
        amountPaise,
        receipt: order.id,
        notes: { shopkart_order_id: order.id },
      });
      razorpayOrderId = rzOrder.id;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { razorpayOrderId },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });
    const addressSnapshot = (order.addressSnapshot || {}) as Record<string, any>;

    const amountPaise = this.toPaise(payment.amount);

    return {
      orderId: order.id,
      paymentId: payment.id,
      razorpayOrderId,
      amount: amountPaise,
      amountInr: new Prisma.Decimal(payment.amount).toFixed(2),
      currency: 'INR',
      keyId: this.razorpay.keyId,
      prefill: {
        name: user?.name || addressSnapshot.fullName || 'Customer',
        email: user?.email || undefined,
        contact: user?.phone || addressSnapshot.phone || undefined,
      },
    };
  }

  private async resolveRetryableOrder(userId: string, orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Order does not belong to you');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot retry payment for a cancelled order');
    }

    const payment = order.payments.find((p) => p.paymentMethod === PaymentMethod.ONLINE);
    if (!payment) {
      throw new BadRequestException('Order does not have an online payment record');
    }
    if (TERMINAL_PAYMENT_STATUSES.includes(payment.paymentStatus)) {
      throw new BadRequestException(`Payment for this order is already ${payment.paymentStatus}`);
    }

    return order.id;
  }

  // ---------------- Step C: Verify payment ----------------

  async verifyPayment(userId: string, dto: VerifyRazorpayPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Order does not belong to you');
    }

    const payment = order.payments.find(
      (p) => p.paymentMethod === PaymentMethod.ONLINE && p.razorpayOrderId === dto.razorpayOrderId,
    );

    if (!payment) {
      throw new BadRequestException(
        'Razorpay order does not belong to this order',
      );
    }

    // Signature must be valid before ANY success state is returned.
    const signatureValid = this.razorpay.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!signatureValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Idempotent replay: payment already processed.
    if (TERMINAL_PAYMENT_STATUSES.includes(payment.paymentStatus)) {
      return {
        status: payment.paymentStatus,
        paymentStatus: payment.paymentStatus,
        orderId: order.id,
        orderStatus: order.status,
        razorpayPaymentId: payment.razorpayPaymentId || dto.razorpayPaymentId,
      };
    }

    // Confirm the payment with Razorpay's API (never trust the client alone).
    let rzPayment: any;
    try {
      rzPayment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    } catch (err: any) {
      this.logger.error(`Razorpay payment fetch failed: ${err?.message || err}`);
      throw new BadRequestException('Unable to verify payment with Razorpay. Please try again.');
    }

    if (!rzPayment || rzPayment.order_id !== payment.razorpayOrderId) {
      throw new BadRequestException('Payment does not belong to this Razorpay order');
    }
    if ((rzPayment.currency || 'INR').toUpperCase() !== 'INR') {
      throw new BadRequestException('Payment currency mismatch');
    }
    if (Number(rzPayment.amount) !== this.toPaise(payment.amount)) {
      throw new BadRequestException('Payment amount mismatch');
    }
    if (rzPayment.status !== 'captured') {
      throw new BadRequestException(
        `Payment is not in a captured state (status: ${rzPayment.status || 'unknown'})`,
      );
    }

    return this.markPaymentCaptured({
      paymentId: payment.id,
      orderId: order.id,
      razorpayPaymentId: dto.razorpayPaymentId,
    });
  }

  // ---------------- Webhook ----------------

  async handleWebhook(rawBody: Buffer | string | undefined, signature: string | undefined, event: any) {
    this.razorpayMissingGuard();

    if (!rawBody || !this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const eventType = event?.event as string | undefined;
    this.logger.log(`Razorpay webhook received: ${eventType || 'unknown'}`);

    try {
      switch (eventType) {
        case 'payment.captured': {
          const entity = event?.payload?.payment?.entity;
          if (!entity?.id || !entity?.order_id) {
            throw new BadRequestException('Malformed payment.captured payload');
          }
          await this.handleCapturedEntity(entity);
          break;
        }
        case 'payment.failed': {
          const entity = event?.payload?.payment?.entity;
          if (entity?.order_id) {
            await this.markPaymentFailed(
              entity.order_id,
              entity?.error?.description || entity?.error?.reason || 'Payment failed',
            );
          }
          break;
        }
        case 'order.paid': {
          const razorpayOrderId = event?.payload?.order?.entity?.id;
          if (!razorpayOrderId) {
            throw new BadRequestException('Malformed order.paid payload');
          }
          // order.paid carries no payment id; resolve the captured payment
          // directly from Razorpay so the same verified path is used.
          const payments = await this.razorpay.fetchOrderPayments(razorpayOrderId);
          const captured = (payments || []).find((p: any) => p.status === 'captured');
          if (captured) {
            await this.handleCapturedEntity(captured);
          } else {
            this.logger.warn(`order.paid ${razorpayOrderId}: no captured payment found yet`);
          }
          break;
        }
        default:
          this.logger.log(`Ignoring Razorpay webhook event: ${eventType}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Webhook processing failed for ${eventType}: ${err?.message || err}`,
      );
      throw err;
    }

    return { received: true };
  }

  private async handleCapturedEntity(entity: any) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: entity.order_id },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn(
        `Webhook payment.captured for unknown Razorpay order ${entity.order_id}`,
      );
      return;
    }

    // Cross-check amount/currency against our stored authoritative record.
    if (entity.currency && entity.currency.toUpperCase() !== 'INR') {
      this.logger.error(`Webhook currency mismatch for payment ${payment.id}`);
      return;
    }
    if (entity.amount != null && Number(entity.amount) !== this.toPaise(payment.amount)) {
      this.logger.error(`Webhook amount mismatch for payment ${payment.id}`);
      return;
    }

    await this.markPaymentCaptured({
      paymentId: payment.id,
      orderId: payment.orderId,
      razorpayPaymentId: entity.id,
    });
  }

  // ---------------- Shared state transitions ----------------

  /**
   * Marks an ONLINE payment captured. Idempotent and never regresses:
   * terminal states are returned unchanged. If the order was cancelled
   * before capture, the payment is flagged REFUND_PENDING for manual
   * reconciliation instead of reviving the order.
   */
  async markPaymentCaptured(params: {
    paymentId: string;
    orderId: string;
    razorpayPaymentId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: params.paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (TERMINAL_PAYMENT_STATUSES.includes(payment.paymentStatus)) {
        return {
          status: payment.paymentStatus,
          paymentStatus: payment.paymentStatus,
          orderId: payment.orderId,
          orderStatus: payment.order?.status,
          razorpayPaymentId: payment.razorpayPaymentId,
        };
      }

      const currentOrderStatus = payment.order?.status;
      const orderCancelled = currentOrderStatus === OrderStatus.CANCELLED;
      const newStatus = orderCancelled
        ? PaymentStatus.REFUND_PENDING
        : PaymentStatus.PAID;

      // Concurrency-safe update: only transition non-terminal rows.
      const updated = await tx.payment.updateMany({
        where: {
          id: payment.id,
          paymentStatus: { notIn: TERMINAL_PAYMENT_STATUSES },
        },
        data: {
          paymentStatus: newStatus,
          razorpayPaymentId: params.razorpayPaymentId,
          transactionReference: params.razorpayPaymentId,
          paymentVerifiedAt: new Date(),
          failureReason: null,
        },
      });

      let orderStatus = currentOrderStatus;

      if (updated.count === 1) {
        if (newStatus === PaymentStatus.PAID && currentOrderStatus === OrderStatus.PENDING) {
          await tx.order.update({
            where: { id: params.orderId },
            data: { status: OrderStatus.CONFIRMED, updatedAt: new Date() },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: params.orderId,
              status: OrderStatus.CONFIRMED,
              notes: 'Payment captured and verified via Razorpay',
            },
          });
          orderStatus = OrderStatus.CONFIRMED;
        } else if (newStatus === PaymentStatus.REFUND_PENDING) {
          // Captured after cancellation: flag for reconciliation. The order
          // stays CANCELLED and is never revived by a late payment event.
          await tx.orderStatusHistory.create({
            data: {
              orderId: params.orderId,
              status: currentOrderStatus ?? OrderStatus.PENDING,
              notes:
                'Payment captured after order cancellation; flagged for refund reconciliation',
            },
          });
          this.logger.warn(
            `Payment ${payment.id} captured after order ${params.orderId} was cancelled; marked REFUND_PENDING`,
          );
        }
      }

      const fresh = await tx.payment.findUnique({ where: { id: payment.id } });

      return {
        status: fresh?.paymentStatus ?? newStatus,
        paymentStatus: fresh?.paymentStatus ?? newStatus,
        orderId: params.orderId,
        orderStatus,
        razorpayPaymentId: params.razorpayPaymentId,
      };
    });
  }

  /**
   * Marks an ONLINE payment FAILED. Only non-terminal online payments are
   * affected, so delayed webhooks can never regress a captured payment.
   */
  async markPaymentFailed(razorpayOrderId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment || payment.paymentMethod !== PaymentMethod.ONLINE) {
      this.logger.warn(
        `payment.failed webhook for unknown Razorpay order ${razorpayOrderId}`,
      );
      return { ignored: true };
    }

    if (TERMINAL_PAYMENT_STATUSES.includes(payment.paymentStatus)) {
      return { ignored: true, status: payment.paymentStatus };
    }

    await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        paymentStatus: { in: RETRYABLE_PAYMENT_STATUSES },
      },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        failureReason: (reason || 'Payment failed').substring(0, 500),
      },
    });

    this.logger.log(`Payment ${payment.id} marked FAILED (${reason || 'no reason'})`);
    return { ignored: false, status: PaymentStatus.FAILED };
  }

  // ---------------- Helpers ----------------

  private razorpayMissingGuard(): void {
    if (!this.razorpay.isConfigured()) {
      const missing = this.razorpay.missingConfig();
      const detail =
        missing.length > 0
          ? `Missing configuration: ${missing.join(', ')}`
          : 'RAZORPAY_KEY_ID must be a test key (rzp_test_*)';
      throw new BadRequestException(
        `Online payments are unavailable. ${detail}`,
      );
    }
  }

  private toPaise(amount: Prisma.Decimal | number | string): number {
    return Math.round(Number(amount) * 100);
  }
}

