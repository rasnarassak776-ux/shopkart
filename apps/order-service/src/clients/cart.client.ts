import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CartClientItem {
  id: string;
  productId: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  available: boolean;
}

export interface CartClientResponse {
  cartId: string | null;
  items: CartClientItem[];
  summary: {
    totalItems: number;
    availableItems: number;
    subtotal: string;
  };
}

@Injectable()
export class CartClient {
  private readonly logger = new Logger(CartClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number = 5000;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('CART_API_URL') ||
      this.configService.get<string>('CART_SERVICE_URL') ||
      process.env.CART_API_URL ||
      process.env.CART_SERVICE_URL ||
      process.env.NEXT_PUBLIC_CART_API_URL ||
      'http://localhost:3030';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  async getCart(authToken: string): Promise<CartClientResponse> {
    const url = `${this.baseUrl}/api/v1/cart`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        this.logger.error(
          `Cart service returned status ${response.status} when fetching cart`,
        );
        throw new ServiceUnavailableException('Cart Service is temporarily unavailable');
      }

      const data = await response.json();
      return (data && data.data ? data.data : data) as CartClientResponse;
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      this.logger.error(`Failed to reach Cart service at ${url}: ${err.message}`, err.stack);
      throw new ServiceUnavailableException('Cart Service is temporarily unavailable');
    }
  }

  async convertCart(authToken: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/cart/convert`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(
          `Cart service returned status ${response.status} when converting cart`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Failed to call convert cart on Cart service: ${err.message}`);
    }
  }
}
