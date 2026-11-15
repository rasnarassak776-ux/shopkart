import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface RazorpayOrderCreateParams {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}

@Injectable()
export class RazorpayService implements OnModuleInit {
  private readonly logger = new Logger(RazorpayService.name);
  private client: Razorpay | null = null;

  readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.keyId = (this.config.get<string>('RAZORPAY_KEY_ID') || '').trim();
    this.keySecret = (this.config.get<string>('RAZORPAY_KEY_SECRET') || '').trim();
    this.webhookSecret = (this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '').trim();
  }

  onModuleInit(): void {
    const missing = this.missingConfig();
    if (missing.length > 0) {
      this.logger.error(
        `Razorpay is not configured. Missing/empty env vars: ${missing.join(', ')}. ` +
          'Online payments will be unavailable until these are set; COD checkout is unaffected.',
      );
      return;
    }

    if (!this.keyId.startsWith('rzp_test_')) {
      this.logger.error(
        'RAZORPAY_KEY_ID does not look like a test key (expected rzp_test_*). ' +
          'Live mode is not supported by this integration; online payments stay disabled.',
      );
      return;
    }

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
    this.logger.log('Razorpay client initialized in TEST MODE');
  }

  missingConfig(): string[] {
    const missing: string[] = [];
    if (!this.keyId) missing.push('RAZORPAY_KEY_ID');
    if (!this.keySecret) missing.push('RAZORPAY_KEY_SECRET');
    if (!this.webhookSecret) missing.push('RAZORPAY_WEBHOOK_SECRET');
    return missing;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private requireClient(): Razorpay {
    if (!this.client) {
      const missing = this.missingConfig();
      const reason =
        missing.length > 0
          ? `Missing configuration: ${missing.join(', ')}`
          : 'RAZORPAY_KEY_ID must be a test key (rzp_test_*)';
      throw new ServiceUnavailableException(
        `Online payments are temporarily unavailable. ${reason}.`,
      );
    }
    return this.client;
  }

  async createOrder(params: RazorpayOrderCreateParams): Promise<{ id: string }> {
    const order = await this.requireClient().orders.create({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      payment_capture: true,
      notes: params.notes,
    });
    return { id: order.id };
  }

  async fetchPayment(paymentId: string): Promise<any> {
    return this.requireClient().payments.fetch(paymentId);
  }

  async fetchOrderPayments(razorpayOrderId: string): Promise<any[]> {
    const result = await this.requireClient().orders.fetchPayments(razorpayOrderId);
    return (result as any)?.items ?? [];
  }

  /**
   * Verifies the Checkout handler signature:
   * HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
   */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string,
  ): boolean {
    if (!this.keySecret || !signature) return false;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    return safeHexEqual(expected, signature);
  }

  /**
   * Verifies an inbound webhook signature against the RAW request body:
   * HMAC_SHA256(rawBody, webhook_secret) compared to x-razorpay-signature.
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature?: string): boolean {
    if (!this.webhookSecret || !signature || !rawBody) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return safeHexEqual(expected, signature);
  }
}

function safeHexEqual(expectedHex: string, provided: string): boolean {
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(provided.trim().toLowerCase(), 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
