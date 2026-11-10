import { PasswordService } from '../auth/services/password.service';
import { createFakePrisma } from '../test-utils/fake-prisma';
import { bootstrapSuperadmin, BootstrapError, readBootstrapConfig } from './bootstrap-superadmin';

const env = {
  SUPERADMIN_EMAIL: '  Root@Shopkart.TEST ',
  SUPERADMIN_PASSWORD: 'Sup3r!SecretPass',
  SUPERADMIN_NAME: 'Platform Owner',
};

// Fast hashing keeps the suite quick; production uses the default cost-12 PasswordService.
const fastPasswords = { hash: async (p: string) => `hashed:${p.length}`, compare: async () => true } as unknown as PasswordService;

describe('bootstrapSuperadmin', () => {
  it('creates exactly one superadmin with a hashed password and an audit entry', async () => {
    const db = createFakePrisma();
    const outcome = await bootstrapSuperadmin(db.prisma, env, new PasswordService());

    expect(outcome).toMatchObject({ status: 'created', email: 'root@shopkart.test' });
    expect(db.users).toHaveLength(1);
    const [user] = db.users;
    expect(user.roleId).toBe(db.roleId('superadmin'));
    expect(user.passwordHash).not.toContain(env.SUPERADMIN_PASSWORD);
    expect(await new PasswordService().compare(env.SUPERADMIN_PASSWORD, user.passwordHash)).toBe(true);
    expect(db.auditLogs).toEqual([
      expect.objectContaining({ action: 'superadmin.bootstrapped', actorId: null, targetUserId: user.id }),
    ]);
  });

  it('is a no-op once a superadmin exists (no duplicates, credentials untouched)', async () => {
    const db = createFakePrisma();
    await bootstrapSuperadmin(db.prisma, env, fastPasswords);
    const originalHash = db.users[0].passwordHash;

    const second = await bootstrapSuperadmin(
      db.prisma,
      { ...env, SUPERADMIN_EMAIL: 'other@shopkart.test', SUPERADMIN_PASSWORD: 'An0ther!Password' },
      fastPasswords,
    );
    expect(second.status).toBe('skipped');
    expect(db.users).toHaveLength(1);
    expect(db.users[0].passwordHash).toBe(originalHash);
  });

  it('skips without requiring credentials when already provisioned', async () => {
    const db = createFakePrisma();
    await bootstrapSuperadmin(db.prisma, env, fastPasswords);
    await expect(bootstrapSuperadmin(db.prisma, {}, fastPasswords)).resolves.toMatchObject({ status: 'skipped' });
  });

  it('refuses to promote an existing account with the same email', async () => {
    const db = createFakePrisma();
    db.users.push({ id: 'u1', email: 'root@shopkart.test', roleId: db.roleId('customer'), isActive: true });
    await expect(bootstrapSuperadmin(db.prisma, env, fastPasswords)).rejects.toThrow(BootstrapError);
    expect(db.users).toHaveLength(1);
    expect(db.users[0].roleId).toBe(db.roleId('customer'));
  });
});

describe('readBootstrapConfig', () => {
  it('requires email and password from the environment', () => {
    expect(() => readBootstrapConfig({})).toThrow(/SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD/);
    expect(() => readBootstrapConfig({ SUPERADMIN_EMAIL: 'a@b.co' })).toThrow(BootstrapError);
  });

  it('rejects invalid emails and weak passwords', () => {
    expect(() => readBootstrapConfig({ ...env, SUPERADMIN_EMAIL: 'nope' })).toThrow(/valid email/);
    for (const weak of ['short1!A', 'alllowercase123!', 'NoSymbolsHere123']) {
      expect(() => readBootstrapConfig({ ...env, SUPERADMIN_PASSWORD: weak })).toThrow(/SUPERADMIN_PASSWORD/);
    }
  });

  it('normalizes email and defaults the name', () => {
    expect(readBootstrapConfig({ ...env, SUPERADMIN_NAME: '' })).toEqual({
      email: 'root@shopkart.test',
      password: env.SUPERADMIN_PASSWORD,
      name: 'Superadmin',
    });
  });
});
