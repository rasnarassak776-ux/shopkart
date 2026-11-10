import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@shopkart/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { TokenService } from '../auth/services/token.service';
import { AuditLogService, AuditContext } from '../audit/audit-log.service';
import { AuditAction } from '../audit/audit-actions';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto, UpdateAdminStatusDto } from './dto/update-admin.dto';
import { QueryAdminsDto } from './dto/query-admins.dto';

const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

type AdminRecord = Prisma.UserGetPayload<{ select: typeof ADMIN_SELECT }>;

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const toAdmin = ({ role, ...rest }: AdminRecord): AdminAccount => ({ ...rest, role: role.name });

/** Every query in this service is scoped to the `admin` role, so superadmins and customers can never be targeted. */
const ADMIN_SCOPE = { role: { name: UserRole.ADMIN } } satisfies Prisma.UserWhereInput;

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateAdminDto, context: AuditContext): Promise<AdminAccount> {
    const email = dto.email.trim().toLowerCase();
    await this.assertEmailAvailable(email);

    const adminRole = await this.prisma.role.findUnique({ where: { name: UserRole.ADMIN } });
    if (!adminRole) {
      this.logger.error('System configuration error: "admin" role not found in auth.roles.');
      throw new InternalServerErrorException('Admin role is not configured.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    try {
      const admin = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email,
            passwordHash,
            phone: dto.phone?.trim() || null,
            roleId: adminRole.id,
            isActive: true,
          },
          select: ADMIN_SELECT,
        });
        await this.auditLogService.record(
          context,
          { action: AuditAction.ADMIN_CREATED, targetUserId: created.id, metadata: { email } },
          tx,
        );
        return created;
      });
      return toAdmin(admin);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email address already exists.');
      }
      throw error;
    }
  }

  async findAll(query: QueryAdminsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      ...ADMIN_SCOPE,
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
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: ADMIN_SCOPE }),
      this.prisma.user.count({ where: { ...ADMIN_SCOPE, isActive: true } }),
    ]);

    return {
      data: items.map(toAdmin),
      meta: { page, limit, total: filteredTotal, totalPages: Math.max(1, Math.ceil(filteredTotal / limit)) },
      summary: { total, active, inactive: total - active },
    };
  }

  async findOne(id: string): Promise<AdminAccount> {
    return toAdmin(await this.getAdminOrThrow(id));
  }

  async update(id: string, dto: UpdateAdminDto, context: AuditContext): Promise<AdminAccount> {
    const existing = await this.getAdminOrThrow(id);
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
        const result = await tx.user.update({ where: { id }, data, select: ADMIN_SELECT });
        await this.auditLogService.record(
          context,
          { action: AuditAction.ADMIN_UPDATED, targetUserId: id, metadata: { changedFields } },
          tx,
        );
        return result;
      });
      return toAdmin(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email address already exists.');
      }
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateAdminStatusDto, context: AuditContext): Promise<AdminAccount> {
    const existing = await this.getAdminOrThrow(id);
    if (existing.isActive === dto.isActive) {
      return toAdmin(existing);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { isActive: dto.isActive },
        select: ADMIN_SELECT,
      });
      await this.auditLogService.record(
        context,
        {
          action: dto.isActive ? AuditAction.ADMIN_ACTIVATED : AuditAction.ADMIN_DEACTIVATED,
          targetUserId: id,
          metadata: { email: existing.email },
        },
        tx,
      );
      return result;
    });

    // A deactivated admin loses every session immediately (refresh tokens and live access tokens).
    if (!dto.isActive) {
      await this.tokenService.revokeAllUserSessions(id);
    }

    return toAdmin(updated);
  }

  private async getAdminOrThrow(id: string): Promise<AdminRecord> {
    const admin = await this.prisma.user.findFirst({ where: { id, ...ADMIN_SCOPE }, select: ADMIN_SELECT });
    if (!admin) {
      throw new NotFoundException('Admin account not found.');
    }
    return admin;
  }

  private async assertEmailAvailable(email: string) {
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('An account with this email address already exists.');
    }
  }
}
