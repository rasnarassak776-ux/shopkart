import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole, NotificationType } from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { TokenService } from '../auth/services/token.service';
import { AuditLogService, AuditContext } from '../audit/audit-log.service';
import { AuditAction } from '../audit/audit-actions';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto, UpdateMerchantStatusDto } from './dto/update-merchant.dto';
import { QueryMerchantsDto } from './dto/query-merchants.dto';
import { NotificationClientService } from '../notifications/notification-client.service';

const MERCHANT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

type MerchantRecord = Prisma.UserGetPayload<{ select: typeof MERCHANT_SELECT }>;

export interface MerchantAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const toMerchant = ({ role, ...rest }: MerchantRecord): MerchantAccount => ({ ...rest, role: role.name });

/** Every query in this service is scoped to the `merchant` role, so superadmins and customers can never be targeted. */
const MERCHANT_SCOPE = { role: { name: UserRole.MERCHANT } } satisfies Prisma.UserWhereInput;

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
    @Optional() private readonly notificationClient?: NotificationClientService,
  ) {}

  async create(dto: CreateMerchantDto, context: AuditContext): Promise<MerchantAccount> {
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailAvailable(email);

    const merchantRole = await this.prisma.role.findUnique({ where: { name: UserRole.MERCHANT } });
    if (!merchantRole) {
      this.logger.error('System configuration error: "merchant" role not found in auth.roles.');
      throw new InternalServerErrorException('Merchant role is not configured.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const merchant = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email,
            passwordHash,
            phone: dto.phone?.trim() || null,
            roleId: merchantRole.id,
            isActive: true,
          },
          select: MERCHANT_SELECT,
        });
        await this.auditLogService.record(
          context,
          { action: AuditAction.MERCHANT_CREATED, targetUserId: created.id, metadata: { email } },
          tx,
        );
        return created;
      });

      if (this.notificationClient) {
        this.notificationClient
          .dispatchEvent(NotificationType.MERCHANT_WELCOME, {
            userId: merchant.id,
            merchantId: merchant.id,
            recipientEmail: email,
            businessName: dto.name.trim(),
            contactName: dto.name.trim(),
          })
          .catch((err) =>
            this.logger.warn(`Could not dispatch merchant welcome: ${err.message}`),
          );
      }

      return toMerchant(merchant);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email address already exists.');
      }
      throw error;
    }
  }

  async findAll(query: QueryMerchantsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      ...MERCHANT_SCOPE,
      ...(query.status === 'active' && { isActive: true }),
      ...(query.status === 'inactive' && { isActive: false }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, filteredTotal, total, active] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: MERCHANT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: MERCHANT_SCOPE }),
      this.prisma.user.count({ where: { ...MERCHANT_SCOPE, isActive: true } }),
    ]);

    return {
      data: items.map(toMerchant),
      meta: { page, limit, total: filteredTotal, totalPages: Math.max(1, Math.ceil(filteredTotal / limit)) },
      summary: { total, active, inactive: total - active },
    };
  }

  async findOne(id: string): Promise<MerchantAccount> {
    return toMerchant(await this.getMerchantOrThrow(id));
  }

  async update(id: string, dto: UpdateMerchantDto, context: AuditContext): Promise<MerchantAccount> {
    const existing = await this.getMerchantOrThrow(id);
    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined && dto.name !== existing.name) data.name = dto.name;
    if (dto.email !== undefined && dto.email !== existing.email) {
      await this.assertEmailAvailable(dto.email);
      data.email = dto.email;
    }
    if (dto.phone !== undefined && (dto.phone || null) !== existing.phone) data.phone = dto.phone || null;

    const changedFields = Object.keys(data);
    if (changedFields.length === 0) {
      throw new BadRequestException('No changes were supplied.');
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.user.update({ where: { id }, data, select: MERCHANT_SELECT });
        await this.auditLogService.record(
          context,
          { action: AuditAction.MERCHANT_UPDATED, targetUserId: id, metadata: { changedFields } },
          tx,
        );
        return result;
      });
      return toMerchant(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email address already exists.');
      }
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateMerchantStatusDto, context: AuditContext): Promise<MerchantAccount> {
    const existing = await this.getMerchantOrThrow(id);
    if (existing.isActive === dto.isActive) {
      return toMerchant(existing);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { isActive: dto.isActive },
        select: MERCHANT_SELECT,
      });
      await this.auditLogService.record(
        context,
        {
          action: dto.isActive ? AuditAction.MERCHANT_ACTIVATED : AuditAction.MERCHANT_DEACTIVATED,
          targetUserId: id,
          metadata: { email: existing.email },
        },
        tx,
      );
      return result;
    });

    // A deactivated merchant loses every session immediately (refresh tokens and live access tokens).
    if (!dto.isActive) {
      await this.tokenService.revokeAllUserSessions(id);
    } else if (this.notificationClient) {
      // Activated / Approved merchant event
      this.notificationClient
        .dispatchEvent(NotificationType.MERCHANT_APPROVED, {
          userId: id,
          merchantId: id,
          recipientEmail: existing.email,
          businessName: existing.name,
          contactName: existing.name,
        })
        .catch((err) =>
          this.logger.warn(
            `Could not dispatch merchant approved notification: ${err.message}`,
          ),
        );
    }

    return toMerchant(updated);
  }

  private async getMerchantOrThrow(id: string): Promise<MerchantRecord> {
    const merchant = await this.prisma.user.findFirst({ where: { id, ...MERCHANT_SCOPE }, select: MERCHANT_SELECT });
    if (!merchant) {
      throw new NotFoundException('Merchant account not found.');
    }
    return merchant;
  }

  private async assertEmailAvailable(email: string) {
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('An account with this email address already exists.');
    }
  }
}
