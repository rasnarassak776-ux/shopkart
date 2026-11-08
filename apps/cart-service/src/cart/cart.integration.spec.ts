import { BadRequestException, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ArgumentMetadata } from '@nestjs/common/interfaces';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('Cart DTO Validation & Guard Integration', () => {
  let validationPipe: ValidationPipe;
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeAll(() => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  describe('AddCartItemDto Validation', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: AddCartItemDto,
    };

    it('passes validation with valid productId and quantity', async () => {
      const validPayload = {
        productId: '11111111-1111-4111-8111-111111111111',
        quantity: 2,
      };

      const result = await validationPipe.transform(validPayload, metadata);
      expect(result).toBeInstanceOf(AddCartItemDto);
      expect(result.quantity).toBe(2);
      expect(result.productId).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('rejects invalid product UUID with 400 Bad Request', async () => {
      const payload = {
        productId: 'not-a-uuid',
        quantity: 1,
      };

      await expect(validationPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects quantity of 0 with 400 Bad Request', async () => {
      const payload = {
        productId: '11111111-1111-4111-8111-111111111111',
        quantity: 0,
      };

      await expect(validationPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects negative quantity with 400 Bad Request', async () => {
      const payload = {
        productId: '11111111-1111-4111-8111-111111111111',
        quantity: -5,
      };

      await expect(validationPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects decimal quantity with 400 Bad Request', async () => {
      const payload = {
        productId: '11111111-1111-4111-8111-111111111111',
        quantity: 2.75,
      };

      await expect(validationPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects quantity above maximum of 99 with 400 Bad Request', async () => {
      const payload = {
        productId: '11111111-1111-4111-8111-111111111111',
        quantity: 100,
      };

      await expect(validationPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects unknown request fields such as client-submitted price and userId (forbidNonWhitelisted)', async () => {
      const payload = {
        productId: '11111111-1111-4111-8111-111111111111',
        quantity: 1,
        price: '1.99',
        userId: 'spoofed-user-id',
      };

      await expect(validationPipe.transform(payload, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('UpdateCartItemDto Validation', () => {
    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: UpdateCartItemDto,
    };

    it('passes validation with valid quantity', async () => {
      const validPayload = { quantity: 5 };
      const result = await validationPipe.transform(validPayload, metadata);
      expect(result).toBeInstanceOf(UpdateCartItemDto);
      expect(result.quantity).toBe(5);
    });

    it('rejects zero, negative, and out-of-range quantities', async () => {
      await expect(
        validationPipe.transform({ quantity: 0 }, metadata),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validationPipe.transform({ quantity: -1 }, metadata),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validationPipe.transform({ quantity: 100 }, metadata),
      ).rejects.toThrow(BadRequestException);

      await expect(
        validationPipe.transform({ quantity: 3.14 }, metadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown fields on PATCH', async () => {
      await expect(
        validationPipe.transform({ quantity: 5, extraField: 'hack' }, metadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Guard Rejection without Authentication', () => {
    it('throws UnauthorizedException when no user is attached to request', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('throws when jwt strategy validation yields an error', () => {
      expect(() =>
        guard.handleRequest(new UnauthorizedException('Invalid token'), null),
      ).toThrow(UnauthorizedException);
    });
  });
});
