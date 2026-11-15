import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { VerifyRazorpayPaymentDto } from './dto/payments.dto';

const USER_ID = 'user-123';
const ORDER_ID = 'order-1';
const PAYMENT_ID = 'pay-1';
const RZ_ORDER_ID = 'order_RZ123';
const RZ_PAYMENT_ID = 'pay_RZ123';
const AMOUNT_RUPEES = '500.00';
const AMOUNT_PAISE = 50000;

function onlinePayment(overrides: any = {}) {
  return {
    id: PAYMENT_ID,
    orderId: ORDER_ID,
    paymentMethod: PaymentMethod.ONLINE,
    paymentStatus: PaymentStatus.PENDING,
    amount: new Prisma.Decimal(AMOUNT_RUPEES),
    currency: 'INR',
    razorpayOrderId: RZ_ORDER_ID,
    razorpayPaymentId: null,
    paymentVerifiedAt: null,
    failureReason: null,
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

function orderWithPayments(payments: any[], overrides: any = {}) {
  return {
    id: ORDER_ID,
    userId: USER_ID,
    status: OrderStatus.PENDING,
    totalAmount: new Prisma.Decimal(AMOUNT_RUPEES),
    addressSnapshot: { fullName: 'Jane Doe', phone: '9876543210' },
    payments,
    items: [],
    statusHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9876543210',
      }),
    },
    $transaction: jest.fn((cb: any) =>
      typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb),
    ),
  };

  const mockOrdersService = {
    createOrder: jest.fn(),
  };

  const mockRazorpayService = {
    isConfigured: jest.fn().mockReturnValue(true),
    missingConfig: jest.fn().mockReturnValue([]),
    keyId: 'rzp_test_abc123',
    createOrder: jest.fn(),
    fetchPayment: jest.fn(),
    fetchOrderPayments: jest.fn(),
    verifyPaymentSignature: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
    mockRazorpayService.isConfigured.mockReturnValue(true);
    mockPrismaService.$transaction.mockImplementation((cb: any) =>
      typeof cb === 'function' ? cb(mockPrismaService) : Promise.all(cb),
    );
  });

  // ---------------- createRazorpayOrder ----------------

  describe('createRazorpayOrder', () => {
    it('creates an internal ONLINE order then a Razorpay order', async () => {
      mockOrdersService.createOrder.mockResolvedValue({ id: ORDER_ID });
      mockPrismaService.order.findUnique.mockResolvedValue(
        orderWithPayments([onlinePayment({ razorpayOrderId: null })]),
      );
      mockRazorpayService.createOrder.mockResolvedValue({ id: RZ_ORDER_ID });
      mockPrismaService.payment.update.mockResolvedValue({});

      const result = await service.createRazorpayOrder(
        USER_ID,
        { addressId: '11111111-1111-4111-8111-111111111111' },
        'idem-key-1',
        'Bearer token',
      );

      expect(mockOrdersService.createOrder).toHaveBeenCalledWith(
        USER_ID,
        { addressId: '11111111-1111-4111-8111-111111111111', paymentMethod: 'ONLINE' },
        'idem-key-1',
        'Bearer token',
      );
      expect(mockRazorpayService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amountPaise: AMOUNT_PAISE, receipt: ORDER_ID }),
      );
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ razorpayOrderId: RZ_ORDER_ID }),
        }),
      );
      expect(result.razorpayOrderId).toBe(RZ_ORDER_ID);
      expect(result.keyId).toBe('rzp_test_abc123');
      expect(result.amount).toBe(AMOUNT_PAISE);
      expect(result.currency).toBe('INR');
    });

    it('fails safely when Razorpay is not configured', async () => {
      mockRazorpayService.isConfigured.mockReturnValue(false);
      mockRazorpayService.missingConfig.mockReturnValue(['RAZORPAY_KEY_ID']);

      await expect(
        service.createRazorpayOrder(USER_ID, { addressId: '11111111-1111-4111-8111-111111111111' }, 'k'),
      ).rejects.toThrow(BadRequestException);
      expect(mockOrdersService.createOrder).not.toHaveBeenCalled();
    });

    it('requires addressId or orderId', async () => {
      await expect(service.createRazorpayOrder(USER_ID, {}, 'k')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reuses the stored Razorpay order on idempotent retry (no duplicate gateway order)', async () => {
      mockOrdersService.createOrder.mockResolvedValue({ id: ORDER_ID });
      mockPrismaService.order.findUnique.mockResolvedValue(
        orderWithPayments([onlinePayment()]), // already has razorpayOrderId
      );

      const result = await service.createRazorpayOrder(
        USER_ID,
        { addressId: '11111111-1111-4111-8111-111111111111' },
        'idem-key-1',
      );

      expect(mockRazorpayService.createOrder).not.toHaveBeenCalled();
      expect(result.razorpayOrderId).toBe(RZ_ORDER_ID);
    });

    it('rejects retry for another customer\'s order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(
        orderWithPayments([onlinePayment()], { userId: 'other-user' }),
      );

      await expect(
        service.createRazorpayOrder(USER_ID, { orderId: ORDER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects retry for a cancelled order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(
        orderWithPayments([onlinePayment()], { status: OrderStatus.CANCELLED }),
      );

      await expect(
        service.createRazorpayOrder(USER_ID, { orderId: ORDER_ID }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ---------------- verifyPayment ----------------

  describe('verifyPayment', () => {
    const validDto: VerifyRazorpayPaymentDto = {
      orderId: ORDER_ID,
      razorpayOrderId: RZ_ORDER_ID,
      razorpayPaymentId: RZ_PAYMENT_ID,
      razorpaySignature: 'valid-sig',
    };

    function mockOrderForVerify(paymentOverrides: any = {}, orderOverrides: any = {}) {
      mockPrismaService.order.findUnique.mockResolvedValue(
        orderWithPayments([onlinePayment(paymentOverrides)], orderOverrides),
      );
    }

    function mockCapturedRazorpayPayment(overrides: any = {}) {
      mockRazorpayService.fetchPayment.mockResolvedValue({
        id: RZ_PAYMENT_ID,
        order_id: RZ_ORDER_ID,
        amount: AMOUNT_PAISE,
        currency: 'INR',
        status: 'captured',
        ...overrides,
      });
    }

    it('verifies signature, confirms capture with Razorpay and marks PAID + order CONFIRMED', async () => {
      mockOrderForVerify();
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockCapturedRazorpayPayment();
      // markPaymentCaptured transaction reads
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce(onlinePayment({ order: orderWithPayments([]) }))
        .mockResolvedValueOnce(onlinePayment({ paymentStatus: PaymentStatus.PAID, razorpayPaymentId: RZ_PAYMENT_ID }));
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});

      const result = await service.verifyPayment(USER_ID, validDto);

      expect(mockRazorpayService.verifyPaymentSignature).toHaveBeenCalledWith(
        RZ_ORDER_ID,
        RZ_PAYMENT_ID,
        'valid-sig',
      );
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.orderStatus).toBe(OrderStatus.CONFIRMED);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.CONFIRMED }),
        }),
      );
    });

    it('rejects an invalid signature', async () => {
      mockOrderForVerify();
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(false);

      await expect(service.verifyPayment(USER_ID, validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRazorpayService.fetchPayment).not.toHaveBeenCalled();
    });

    it('rejects a Razorpay order ID that does not belong to the internal order', async () => {
      mockOrderForVerify();
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);

      await expect(
        service.verifyPayment(USER_ID, { ...validDto, razorpayOrderId: 'order_OTHER' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects verification for another customer\'s order', async () => {
      mockOrderForVerify({}, { userId: 'other-user' });

      await expect(service.verifyPayment(USER_ID, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('is idempotent: duplicate verification returns PAID without reprocessing', async () => {
      mockOrderForVerify({ paymentStatus: PaymentStatus.PAID, razorpayPaymentId: RZ_PAYMENT_ID });
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);

      const result = await service.verifyPayment(USER_ID, validDto);

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockRazorpayService.fetchPayment).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('rejects amount mismatch reported by Razorpay', async () => {
      mockOrderForVerify();
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockCapturedRazorpayPayment({ amount: 49900 });

      await expect(service.verifyPayment(USER_ID, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a payment that Razorpay reports as not captured', async () => {
      mockOrderForVerify();
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockCapturedRazorpayPayment({ status: 'authorized' });

      await expect(service.verifyPayment(USER_ID, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('flags REFUND_PENDING instead of reviving a cancelled order', async () => {
      mockOrderForVerify({}, { status: OrderStatus.CANCELLED });
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockCapturedRazorpayPayment();
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce(onlinePayment({ order: orderWithPayments([], { status: OrderStatus.CANCELLED }) }))
        .mockResolvedValueOnce(onlinePayment({ paymentStatus: PaymentStatus.REFUND_PENDING }));
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});

      const result = await service.verifyPayment(USER_ID, validDto);

      expect(result.paymentStatus).toBe(PaymentStatus.REFUND_PENDING);
      expect(result.orderStatus).toBe(OrderStatus.CANCELLED);
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });
  });

  // ---------------- Webhooks ----------------

  describe('handleWebhook', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

    it('rejects an invalid webhook signature', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(rawBody, 'bad-sig', { event: 'payment.captured' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('processes payment.captured idempotently', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce(onlinePayment({ order: orderWithPayments([]) }))
        .mockResolvedValueOnce(onlinePayment({ order: orderWithPayments([]) }))
        .mockResolvedValueOnce(onlinePayment({ paymentStatus: PaymentStatus.PAID }));
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});

      const event = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: RZ_PAYMENT_ID,
              order_id: RZ_ORDER_ID,
              amount: AMOUNT_PAISE,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      const result = await service.handleWebhook(rawBody, 'sig', event);
      expect(result).toEqual({ received: true });
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalled();
    });

    it('does not regress a PAID payment on a delayed duplicate webhook', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce(onlinePayment({ paymentStatus: PaymentStatus.PAID, order: orderWithPayments([]) }))
        .mockResolvedValueOnce(onlinePayment({ paymentStatus: PaymentStatus.PAID }));

      const event = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: RZ_PAYMENT_ID, order_id: RZ_ORDER_ID, amount: AMOUNT_PAISE, currency: 'INR' } } },
      };

      await service.handleWebhook(rawBody, 'sig', event);
      // Terminal guard: no status write attempted
      expect(mockPrismaService.payment.updateMany).not.toHaveBeenCalled();
    });

    it('records payment.failed without touching terminal payments', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockPrismaService.payment.findUnique.mockResolvedValue(onlinePayment());
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });

      const event = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              order_id: RZ_ORDER_ID,
              error: { description: 'Card declined' },
            },
          },
        },
      };

      await service.handleWebhook(rawBody, 'sig', event);
      expect(mockPrismaService.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.FAILED,
            failureReason: 'Card declined',
          }),
        }),
      );
    });

    it('never marks a PAID payment as FAILED', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockPrismaService.payment.findUnique.mockResolvedValue(
        onlinePayment({ paymentStatus: PaymentStatus.PAID }),
      );

      const event = {
        event: 'payment.failed',
        payload: { payment: { entity: { order_id: RZ_ORDER_ID } } },
      };

      const result = await service.handleWebhook(rawBody, 'sig', event);
      expect(result).toEqual({ received: true });
      expect(mockPrismaService.payment.updateMany).not.toHaveBeenCalled();
    });

    it('resolves order.paid via Razorpay order payments lookup', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockRazorpayService.fetchOrderPayments.mockResolvedValue([
        { id: RZ_PAYMENT_ID, order_id: RZ_ORDER_ID, amount: AMOUNT_PAISE, currency: 'INR', status: 'captured' },
      ]);
      mockPrismaService.payment.findUnique
        .mockResolvedValueOnce(onlinePayment({ order: orderWithPayments([]) }))
        .mockResolvedValueOnce(onlinePayment({ order: orderWithPayments([]) }))
        .mockResolvedValueOnce(onlinePayment({ paymentStatus: PaymentStatus.PAID }));
      mockPrismaService.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.order.update.mockResolvedValue({});
      mockPrismaService.orderStatusHistory.create.mockResolvedValue({});

      const event = {
        event: 'order.paid',
        payload: { order: { entity: { id: RZ_ORDER_ID } } },
      };

      const result = await service.handleWebhook(rawBody, 'sig', event);
      expect(result).toEqual({ received: true });
      expect(mockRazorpayService.fetchOrderPayments).toHaveBeenCalledWith(RZ_ORDER_ID);
    });
  });
});
