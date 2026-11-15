import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
} from './dto/payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments/razorpay')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Step A — create the internal order (or retry an existing one) and a
   * Razorpay order for the server-calculated total.
   */
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRazorpayOrderDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.paymentsService.createRazorpayOrder(
      userId,
      dto,
      idempotencyKey,
      authHeader,
    );
  }

  /**
   * Step C — verify the Checkout handler response (signature + Razorpay API)
   * and mark the internal payment/order accordingly.
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyRazorpayPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(userId, dto);
  }

  /**
   * Razorpay webhook receiver. Public endpoint: authenticity is established
   * by the x-razorpay-signature HMAC over the raw request body.
   */
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!signature) {
      throw new UnauthorizedException('Missing x-razorpay-signature header');
    }
    const rawBody = req.rawBody;
    const event = req.body;
    return this.paymentsService.handleWebhook(rawBody, signature, event);
  }
}
