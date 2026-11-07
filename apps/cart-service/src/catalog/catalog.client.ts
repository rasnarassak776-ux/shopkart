import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogProduct, CatalogProductImage } from './catalog-product.interface';

@Injectable()
export class CatalogClient {
  private readonly logger = new Logger(CatalogClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number = 5000;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('CATALOG_API_URL') ||
      this.configService.get<string>('CATALOG_SERVICE_URL') ||
      process.env.CATALOG_API_URL ||
      process.env.CATALOG_SERVICE_URL ||
      process.env.NEXT_PUBLIC_CATALOG_API_URL ||
      'http://localhost:3020';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  async getProduct(productId: string): Promise<CatalogProduct | null> {
    const url = `${this.baseUrl}/api/v1/catalog/products/${encodeURIComponent(productId)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.status === 404 || response.status === 400) {
        return null;
      }

      if (!response.ok) {
        this.logger.error(
          `Catalog service responded with HTTP status ${response.status} for product ${productId}`,
        );
        throw new ServiceUnavailableException('Catalog Service is temporarily unavailable');
      }

      const data = await response.json();
      const product =
        data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)
          ? data.data
          : data;

      if (!product || typeof product !== 'object' || !product.id || !product.name || product.price === undefined) {
        this.logger.error(
          `Catalog service returned invalid response format for product ${productId}`,
        );
        throw new ServiceUnavailableException('Catalog Service returned an invalid response');
      }

      return product as CatalogProduct;
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }

      this.logger.error(
        `Failed to reach Catalog service at ${url}: ${err.message}`,
        err.stack,
      );
      throw new ServiceUnavailableException('Catalog Service is temporarily unavailable');
    }
  }

  getPrimaryImageUrl(product: CatalogProduct): string | null {
    if (!product.images || product.images.length === 0) {
      return null;
    }

    const primary = product.images.find((img) => img.isPrimary);
    if (primary && primary.imageUrl) {
      return primary.imageUrl;
    }

    const sorted = [...product.images].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );

    return sorted[0]?.imageUrl || null;
  }
}
