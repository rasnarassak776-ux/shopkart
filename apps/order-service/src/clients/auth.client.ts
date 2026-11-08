import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number = 5000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const rawUrl =
      this.configService.get<string>('AUTH_API_URL') ||
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      process.env.AUTH_API_URL ||
      process.env.AUTH_SERVICE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  async getAddressSnapshot(
    userId: string,
    addressId: string,
    authToken?: string,
  ): Promise<AddressSnapshot> {
    // 1. Attempt inter-service HTTP request to Auth Service if token provided
    if (authToken) {
      try {
        const url = `${this.baseUrl}/api/v1/users/me/addresses/${encodeURIComponent(addressId)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`,
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.status === 404) {
          throw new NotFoundException('Delivery address not found or does not belong to user');
        }

        if (response.ok) {
          const body = await response.json();
          const addr = body && body.data ? body.data : body;
          if (addr && addr.addressLine1) {
            return this.formatSnapshot(addr);
          }
        }
      } catch (err: any) {
        if (err instanceof NotFoundException) {
          throw err;
        }
        this.logger.warn(
          `Auth service HTTP call failed, falling back to database check: ${err.message}`,
        );
      }
    }

    // 2. Database direct lookup fallback (shared PostgreSQL database)
    const dbAddress = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!dbAddress) {
      throw new NotFoundException('Delivery address not found or does not belong to user');
    }

    return this.formatSnapshot(dbAddress);
  }

  private formatSnapshot(addr: any): AddressSnapshot {
    return {
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || null,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || 'India',
    };
  }
}
