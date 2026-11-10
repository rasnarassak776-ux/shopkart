import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

type Row = Record<string, any>;

/**
 * Minimal in-memory stand-in for the Prisma client, covering only the auth
 * queries used by AuthService, JwtStrategy, MerchantsService, AuditLogService and
 * the superadmin bootstrap. Honors `select` so tests catch accidental field leaks.
 */
export function createFakePrisma() {
  const roles: Row[] = ['customer', 'merchant', 'superadmin'].map((name) => ({
    id: randomUUID(),
    name,
    createdAt: new Date(),
  }));
  const users: Row[] = [];
  const auditLogs: Row[] = [];

  const withRole = (u: Row) => ({ ...u, role: roles.find((r) => r.id === u.roleId) });

  const project = (row: Row, select: Row): Row =>
    Object.fromEntries(
      Object.entries(select)
        .filter(([, v]) => v)
        .map(([k, v]) => [k, v === true ? row[k] : project(row[k], v.select)]),
    );

  const shape = (u: Row, args: Row = {}) => {
    const full = withRole(u);
    if (args.select) return project(full, args.select);
    return args.include?.role ? full : { ...u };
  };

  const fieldMatches = (value: unknown, cond: any) => {
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(value);
      if ('contains' in cond) return String(value).toLowerCase().includes(String(cond.contains).toLowerCase());
    }
    return value === cond;
  };

  const matches = (u: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'OR') return (cond as Row[]).some((c) => matches(u, c));
      if (key === 'role') return withRole(u).role?.name === cond.name;
      return fieldMatches(u[key], cond);
    });

  const prisma: any = {
    role: {
      findUnique: async ({ where }: Row) => roles.find((r) => r.name === where.name || r.id === where.id) ?? null,
      upsert: async ({ where, create }: Row) => {
        let role = roles.find((r) => r.name === where.name);
        if (!role) roles.push((role = { id: randomUUID(), createdAt: new Date(), ...create }));
        return role;
      },
    },
    user: {
      findUnique: async (args: Row) => {
        const u = users.find((x) => matches(x, args.where));
        return u ? shape(u, args) : null;
      },
      findFirst: async (args: Row) => {
        const u = users.find((x) => matches(x, args.where));
        return u ? shape(u, args) : null;
      },
      findMany: async (args: Row = {}) =>
        users
          .filter((x) => matches(x, args.where))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? users.length))
          .map((x) => shape(x, args)),
      count: async (args: Row = {}) => users.filter((x) => matches(x, args.where)).length,
      create: async (args: Row) => {
        if (users.some((x) => x.email === args.data.email)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        const now = new Date();
        const u = { id: randomUUID(), phone: null, isActive: true, createdAt: now, updatedAt: now, ...args.data };
        users.push(u);
        return shape(u, args);
      },
      update: async (args: Row) => {
        const u = users.find((x) => x.id === args.where.id);
        if (!u) throw new Error('Record not found');
        Object.assign(u, args.data, { updatedAt: new Date() });
        return shape(u, args);
      },
    },
    auditLog: {
      create: async ({ data }: Row) => {
        const log = { id: randomUUID(), createdAt: new Date(), metadata: null, ...data };
        auditLogs.push(log);
        return log;
      },
      findMany: async ({ take }: Row = {}) => [...auditLogs].reverse().slice(0, take ?? auditLogs.length),
    },
    $transaction: async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)),
    $executeRaw: async () => 1,
  };

  const roleId = (name: string) => roles.find((r) => r.name === name)!.id;

  return { prisma, users, roles, auditLogs, roleId };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
