import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneByUser(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException(
        'Address not found or does not belong to you.',
      );
    }

    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      // Concurrency lock: Exclusively lock user row in PostgreSQL to serialize concurrent address modifications
      await tx.$queryRaw`SELECT id FROM auth.users WHERE id = ${userId}::uuid FOR UPDATE`;

      // Check existing address count for this user
      const count = await tx.address.count({ where: { userId } });

      // If user has no existing addresses, force first address as default
      const willBeDefault = count === 0 || Boolean(dto.isDefault);

      if (willBeDefault && count > 0) {
        // Unset any existing default address
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const address = await tx.address.create({
        data: {
          userId,
          fullName: dto.fullName.trim(),
          phone: dto.phone.trim(),
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2 ? dto.addressLine2.trim() : null,
          city: dto.city.trim(),
          state: dto.state.trim(),
          postalCode: dto.postalCode.trim(),
          country: dto.country ? dto.country.trim() : 'India',
          isDefault: willBeDefault,
        },
      });

      this.logger.log(
        `Address created: id=${address.id}, userId=${userId}, isDefault=${address.isDefault}`,
      );
      return address;
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      // Concurrency lock: Exclusively lock user row in PostgreSQL
      await tx.$queryRaw`SELECT id FROM auth.users WHERE id = ${userId}::uuid FOR UPDATE`;

      // 1. Verify ownership
      const existing = await tx.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!existing) {
        throw new NotFoundException(
          'Address not found or does not belong to you.',
        );
      }

      // 2. If setting as default, unset other defaults
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId, id: { not: addressId }, isDefault: true },
          data: { isDefault: false },
        });
      }

      // 3. Build update payload
      const updateData: {
        fullName?: string;
        phone?: string;
        addressLine1?: string;
        addressLine2?: string | null;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
        isDefault?: boolean;
      } = {};

      if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
      if (dto.phone !== undefined) updateData.phone = dto.phone.trim();
      if (dto.addressLine1 !== undefined)
        updateData.addressLine1 = dto.addressLine1.trim();
      if (dto.addressLine2 !== undefined)
        updateData.addressLine2 = dto.addressLine2 ? dto.addressLine2.trim() : null;
      if (dto.city !== undefined) updateData.city = dto.city.trim();
      if (dto.state !== undefined) updateData.state = dto.state.trim();
      if (dto.postalCode !== undefined)
        updateData.postalCode = dto.postalCode.trim();
      if (dto.country !== undefined) updateData.country = dto.country.trim();
      if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;

      const updated = await tx.address.update({
        where: { id: addressId },
        data: updateData,
      });

      this.logger.log(`Address updated: id=${addressId}, userId=${userId}`);
      return updated;
    });
  }

  async remove(userId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Concurrency lock: Exclusively lock user row in PostgreSQL
      await tx.$queryRaw`SELECT id FROM auth.users WHERE id = ${userId}::uuid FOR UPDATE`;

      // 1. Verify ownership
      const existing = await tx.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!existing) {
        throw new NotFoundException(
          'Address not found or does not belong to you.',
        );
      }

      const wasDefault = existing.isDefault;

      // 2. Delete address
      await tx.address.delete({
        where: { id: addressId },
      });

      // 3. If deleted address was default, designate the most recently created remaining address as new default
      if (wasDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
          this.logger.log(
            `Default address transferred to remaining address id=${nextAddress.id}`,
          );
        }
      }

      this.logger.log(`Address deleted: id=${addressId}, userId=${userId}`);

      return {
        success: true,
        message: 'Address deleted successfully.',
      };
    });
  }

  async setDefault(userId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Concurrency lock: Exclusively lock user row in PostgreSQL
      await tx.$queryRaw`SELECT id FROM auth.users WHERE id = ${userId}::uuid FOR UPDATE`;

      // 1. Verify ownership
      const existing = await tx.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!existing) {
        throw new NotFoundException(
          'Address not found or does not belong to you.',
        );
      }

      // 2. Unset all other addresses
      await tx.address.updateMany({
        where: { userId, id: { not: addressId }, isDefault: true },
        data: { isDefault: false },
      });

      // 3. Set this address as default
      const updated = await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      this.logger.log(
        `Address set as default: id=${addressId}, userId=${userId}`,
      );

      return updated;
    });
  }
}
