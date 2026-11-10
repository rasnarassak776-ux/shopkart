import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditActionType } from './audit-actions';

export interface AuditContext {
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEntry {
  action: AuditActionType;
  targetUserId?: string | null;
  /** Never put passwords, hashes or tokens in here. */
  metadata?: Prisma.InputJsonObject;
}

export function auditContextFrom(req: Request, actorId: string): AuditContext {
  const userAgent = req.headers['user-agent'];
  return {
    actorId,
    ipAddress: req.ip?.slice(0, 64) ?? null,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 255) : null,
  };
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Persists an audit entry; pass a transaction client to commit it atomically with the change. */
  async record(
    context: AuditContext,
    entry: AuditEntry,
    client: Prisma.TransactionClient = this.prisma,
  ) {
    const log = await client.auditLog.create({
      data: {
        actorId: context.actorId,
        action: entry.action,
        targetUserId: entry.targetUserId ?? null,
        metadata: entry.metadata,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
    });
    this.logger.log(
      `AUDIT action=${entry.action} actor=${context.actorId} target=${entry.targetUserId ?? '-'}`,
    );
    return log;
  }

  async findRecent(limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = [
      ...new Set(logs.flatMap((l) => [l.actorId, l.targetUserId]).filter((id): id is string => !!id)),
    ];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      metadata: log.metadata,
      actor: log.actorId ? (byId.get(log.actorId) ?? { id: log.actorId }) : null,
      target: log.targetUserId ? (byId.get(log.targetUserId) ?? { id: log.targetUserId }) : null,
    }));
  }
}
