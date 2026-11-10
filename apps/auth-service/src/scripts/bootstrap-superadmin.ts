/**
 * One-time Superadmin provisioning.
 *
 *   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... SUPERADMIN_NAME=... \
 *     npm run bootstrap:superadmin -w auth-service
 *
 * - Credentials are read from environment variables only (never hardcoded).
 * - The password is hashed with the same PasswordService (bcrypt, cost 12) used at login.
 * - Once any superadmin exists the command is a no-op, so re-running it (or wiring it
 *   into a seed pipeline) can never create duplicates or overwrite credentials.
 * - An existing account with the same email is never silently promoted.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@shopkart/common';
import { PasswordService } from '../auth/services/password.service';
import { AuditAction } from '../audit/audit-actions';

export type BootstrapOutcome =
  | { status: 'created'; userId: string; email: string }
  | { status: 'skipped'; reason: string };

export class BootstrapError extends Error {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
// Arbitrary constant key that serialises concurrent bootstrap runs.
const BOOTSTRAP_LOCK_KEY = 74_201_117;

export function readBootstrapConfig(env: NodeJS.ProcessEnv) {
  const email = env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SUPERADMIN_PASSWORD;
  const name = env.SUPERADMIN_NAME?.trim() || 'Superadmin';

  if (!email || !password) {
    throw new BootstrapError(
      'SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in the environment.',
    );
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw new BootstrapError('SUPERADMIN_EMAIL is not a valid email address.');
  }
  if (!STRONG_PASSWORD.test(password)) {
    throw new BootstrapError(
      'SUPERADMIN_PASSWORD must be 12-128 characters and include upper-case, lower-case, a number and a symbol.',
    );
  }
  if (name.length > 120) {
    throw new BootstrapError('SUPERADMIN_NAME must be at most 120 characters.');
  }
  return { email, password, name };
}

export async function bootstrapSuperadmin(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv,
  passwordService = new PasswordService(),
): Promise<BootstrapOutcome> {
  const existing = await prisma.user.count({
    where: { role: { name: UserRole.SUPERADMIN } },
  });
  if (existing > 0) {
    return { status: 'skipped', reason: 'A superadmin account already exists; bootstrap is disabled.' };
  }

  const config = readBootstrapConfig(env);
  const passwordHash = await passwordService.hash(config.password);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`;

    // Re-check under the lock so concurrent runs cannot both create an account.
    const raced = await tx.user.count({ where: { role: { name: UserRole.SUPERADMIN } } });
    if (raced > 0) {
      return { status: 'skipped', reason: 'A superadmin account already exists; bootstrap is disabled.' } as const;
    }

    if (await tx.user.findUnique({ where: { email: config.email } })) {
      throw new BootstrapError(
        'An account with SUPERADMIN_EMAIL already exists. Refusing to promote an existing account; use a different email.',
      );
    }

    const role = await tx.role.upsert({
      where: { name: UserRole.SUPERADMIN },
      update: {},
      create: { name: UserRole.SUPERADMIN },
    });

    const user = await tx.user.create({
      data: {
        name: config.name,
        email: config.email,
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: null,
        action: AuditAction.SUPERADMIN_BOOTSTRAPPED,
        targetUserId: user.id,
        metadata: { email: user.email, source: 'cli' },
      },
    });

    return { status: 'created', userId: user.id, email: user.email } as const;
  });
}

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

  const prisma = new PrismaClient();
  try {
    const outcome = await bootstrapSuperadmin(prisma, process.env);
    if (outcome.status === 'created') {
      console.log(`Superadmin created: id=${outcome.userId} email=${outcome.email}`);
      console.log('Remove SUPERADMIN_PASSWORD from your environment now that provisioning is complete.');
    } else {
      console.log(`Skipped: ${outcome.reason}`);
    }
  } catch (error) {
    console.error(`Bootstrap failed: ${(error as Error).message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
