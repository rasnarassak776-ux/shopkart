import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cart, CartItem, CartStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogClient } from '../catalog/catalog.client';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  CartItemResponse,
  CartResponse,
} from './interfaces/cart-response.interface';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private readonly MAX_QUANTITY = 99;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClient,
  ) {}

  async getCart(userId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.formatCart(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponse> {
    // 1. Validate product existence and active status via Catalog Service
    const product = await this.catalogClient.getProduct(dto.productId);
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or inactive');
    }

    // 2. Perform atomic get-or-create cart and cart-item upsert within transaction
    await this.prisma.$transaction(async (tx) => {
      // Serialize concurrent cart operations for this user via parameterized PostgreSQL transaction advisory lock
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cart_${userId}`}))`;

      // Find or create active cart
      let cart = await tx.cart.findFirst({
        where: {
          userId,
          status: CartStatus.ACTIVE,
        },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: {
            userId,
            status: CartStatus.ACTIVE,
          },
        });
      }

      // Check if product is already in the cart
      const existingItem = await tx.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: dto.productId,
          },
        },
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + dto.quantity;
        if (newQuantity > this.MAX_QUANTITY) {
          throw new BadRequestException(
            `Total quantity for a product cannot exceed ${this.MAX_QUANTITY}`,
          );
        }

        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            quantity: dto.quantity,
          },
        });
      }
    });

    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
          status: CartStatus.ACTIVE,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
          status: CartStatus.ACTIVE,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return {
      cartId: cart ? cart.id : null,
      items: [],
      summary: {
        totalItems: 0,
        availableItems: 0,
        subtotal: '0.00',
      },
    };
  }

  async convertCart(
    userId: string,
  ): Promise<{ success: boolean; cartId?: string; message?: string }> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
    });

    if (!cart) {
      return { success: true, message: 'No active cart found to convert' };
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { status: CartStatus.CONVERTED },
    });

    this.logger.log(`Cart ${cart.id} converted for user ${userId}`);

    return { success: true, cartId: cart.id };
  }

  private async formatCart(
    cart: (Cart & { items: CartItem[] }) | null,
  ): Promise<CartResponse> {
    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        cartId: cart ? cart.id : null,
        items: [],
        summary: {
          totalItems: 0,
          availableItems: 0,
          subtotal: '0.00',
        },
      };
    }

    const items: CartItemResponse[] = await Promise.all(
      cart.items.map(async (item) => {
        const product = await this.catalogClient.getProduct(item.productId);

        if (product && product.isActive) {
          const unitPrice = new Prisma.Decimal(product.price);
          const lineTotal = unitPrice.mul(item.quantity);

          return {
            id: item.id,
            productId: item.productId,
            name: product.name,
            imageUrl: this.catalogClient.getPrimaryImageUrl(product),
            unitPrice: unitPrice.toFixed(2),
            quantity: item.quantity,
            lineTotal: lineTotal.toFixed(2),
            available: true,
          };
        }

        return {
          id: item.id,
          productId: item.productId,
          name: product?.name || 'Unavailable Product',
          imageUrl: null,
          unitPrice: '0.00',
          quantity: item.quantity,
          lineTotal: '0.00',
          available: false,
        };
      }),
    );

    let subtotal = new Prisma.Decimal(0);
    let totalItems = 0;
    let availableItems = 0;

    for (const item of items) {
      totalItems += item.quantity;
      if (item.available) {
        subtotal = subtotal.add(new Prisma.Decimal(item.lineTotal));
        availableItems += item.quantity;
      }
    }

    return {
      cartId: cart.id,
      items,
      summary: {
        totalItems,
        availableItems,
        subtotal: subtotal.toFixed(2),
      },
    };
  }
}
