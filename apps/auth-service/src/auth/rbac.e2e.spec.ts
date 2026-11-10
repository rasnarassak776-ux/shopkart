import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AddressInfo } from 'net';
import { AuthModule } from './auth.module';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { AdminsModule } from '../admins/admins.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { bootstrapSuperadmin } from '../scripts/bootstrap-superadmin';
import { createFakePrisma, FakePrisma } from '../test-utils/fake-prisma';

jest.setTimeout(30000);

const PASSWORD = 'Str0ng!Passw0rd';
const decode = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

describe('Auth & RBAC (HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let db: FakePrisma;
  let tokenService: TokenService;
  const ids: Record<string, string> = {};

  const request = async (method: string, path: string, { token, body }: { token?: string; body?: unknown } = {}) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as any };
  };

  const login = (email: string, password = PASSWORD) => request('POST', '/auth/login', { body: { email, password } });
  const tokenFor = async (email: string) => (await login(email)).body.accessToken as string;

  beforeAll(async () => {
    db = createFakePrisma();
    const passwordHash = await new PasswordService().hash(PASSWORD);
    const addUser = (key: string, role: string, isActive = true) => {
      const id = `00000000-0000-4000-8000-00000000000${Object.keys(ids).length + 1}`;
      ids[key] = id;
      db.users.push({
        id,
        name: key,
        email: `${key}@shopkart.test`,
        passwordHash,
        phone: null,
        roleId: db.roleId(role),
        isActive,
        createdAt: new Date(Date.now() - Object.keys(ids).length * 1000),
        updatedAt: new Date(),
      });
    };
    addUser('customer', 'customer');
    addUser('admin', 'admin');
    addUser('inactive-admin', 'admin', false);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        RedisModule,
        AuthModule,
        UsersModule,
        AuditModule,
        AdminsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(db.prisma)
      .overrideProvider(RedisService)
      .useValue({ getClient: () => null, ping: async () => false })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    tokenService = moduleRef.get(TokenService);

    // The superadmin is provisioned exactly as in production: via the bootstrap command.
    const outcome = await bootstrapSuperadmin(db.prisma, {
      SUPERADMIN_EMAIL: 'superadmin@shopkart.test',
      SUPERADMIN_PASSWORD: PASSWORD,
      SUPERADMIN_NAME: 'Root',
    });
    if (outcome.status !== 'created') throw new Error('bootstrap failed');
    ids.superadmin = outcome.userId;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('authentication', () => {
    it.each([
      ['customer@shopkart.test', 'customer'],
      ['admin@shopkart.test', 'admin'],
      ['superadmin@shopkart.test', 'superadmin'],
    ])('%s logs in through the shared endpoint with the verified role in the JWT', async (email, role) => {
      const res = await login(email);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(role);
      expect(decode(res.body.accessToken).role).toBe(role);
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('ignores any role supplied in the login request', async () => {
      const res = await request('POST', '/auth/login', {
        body: { email: 'customer@shopkart.test', password: PASSWORD, role: 'superadmin' },
      });
      expect(res.status).toBe(400);
    });

    it('rejects a wrong password and an unknown email with the same message', async () => {
      const wrong = await login('admin@shopkart.test', 'Wr0ng!Password');
      const unknown = await login('nobody@shopkart.test');
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('rejects inactive accounts', async () => {
      const res = await login('inactive-admin@shopkart.test');
      expect(res.status).toBe(401);
      expect(res.body.accessToken).toBeUndefined();
    });

    it('public registration always creates a customer', async () => {
      const res = await request('POST', '/auth/register', {
        body: { name: 'New Shopper', email: 'shopper@shopkart.test', password: 'Passw0rdOk' },
      });
      expect(res.status).toBe(201);
      expect(res.body.customer.role).toBe('customer');
      const stored = db.users.find((u) => u.email === 'shopper@shopkart.test')!;
      expect(stored.roleId).toBe(db.roleId('customer'));
    });

    it.each([{ role: 'admin' }, { role: 'superadmin' }, { roleId: 'any' }])(
      'rejects role injection during registration: %o',
      async (extra) => {
        const res = await request('POST', '/auth/register', {
          body: { name: 'Sneaky', email: `sneaky-${Object.keys(extra)[0]}@shopkart.test`, password: 'Passw0rdOk', ...extra },
        });
        expect(res.status).toBe(400);
        expect(db.users.some((u) => u.name === 'Sneaky')).toBe(false);
      },
    );
  });

  describe('authorization', () => {
    it('requires authentication for admin management', async () => {
      expect((await request('GET', '/admins')).status).toBe(401);
    });

    it('customer cannot access admin or superadmin endpoints', async () => {
      const token = await tokenFor('customer@shopkart.test');
      expect((await request('GET', '/auth/admin-only', { token })).status).toBe(403);
      expect((await request('GET', '/admins', { token })).status).toBe(403);
      expect((await request('GET', '/audit-logs', { token })).status).toBe(403);
    });

    it('admin and superadmin can access regular admin endpoints', async () => {
      for (const email of ['admin@shopkart.test', 'superadmin@shopkart.test']) {
        expect((await request('GET', '/auth/admin-only', { token: await tokenFor(email) })).status).toBe(200);
      }
    });

    it('admin cannot access superadmin-only endpoints or create another admin', async () => {
      const token = await tokenFor('admin@shopkart.test');
      expect((await request('GET', '/admins', { token })).status).toBe(403);
      expect((await request('GET', '/audit-logs', { token })).status).toBe(403);
      const res = await request('POST', '/admins', {
        token,
        body: { name: 'Shadow', email: 'shadow@shopkart.test', password: PASSWORD },
      });
      expect(res.status).toBe(403);
      expect(db.users.some((u) => u.email === 'shadow@shopkart.test')).toBe(false);
    });

    it('a forged role claim is ignored in favour of the database role', async () => {
      const { accessToken } = await tokenService.generateTokenPair({
        id: ids.customer,
        email: 'customer@shopkart.test',
        role: { name: 'superadmin' },
      });
      expect((await request('GET', '/admins', { token: accessToken })).status).toBe(403);
    });

    it('users cannot change their own role through the profile endpoint', async () => {
      const token = await tokenFor('customer@shopkart.test');
      const res = await request('PATCH', '/users/me', { token, body: { role: 'admin' } });
      expect(res.status).toBe(400);
      expect(db.users.find((u) => u.id === ids.customer)!.roleId).toBe(db.roleId('customer'));
    });
  });

  describe('admin management (superadmin)', () => {
    let superToken: string;
    let createdId: string;

    beforeAll(async () => {
      superToken = await tokenFor('superadmin@shopkart.test');
    });

    it('superadmin can create an admin, which is audit-logged and can log in', async () => {
      const res = await request('POST', '/admins', {
        token: superToken,
        body: { name: 'Store Admin', email: 'Store.Admin@Shopkart.test', password: PASSWORD },
      });
      expect(res.status).toBe(201);
      expect(res.body.admin).toMatchObject({ email: 'store.admin@shopkart.test', role: 'admin', isActive: true });
      expect(res.body.admin).not.toHaveProperty('passwordHash');
      createdId = res.body.admin.id;

      expect(db.auditLogs).toContainEqual(
        expect.objectContaining({ action: 'admin.created', actorId: ids.superadmin, targetUserId: createdId }),
      );
      expect(JSON.stringify(db.auditLogs)).not.toContain(PASSWORD);
      expect((await login('store.admin@shopkart.test')).body.user.role).toBe('admin');
    });

    it('rejects duplicate emails and privileged role fields on create', async () => {
      const dup = await request('POST', '/admins', {
        token: superToken,
        body: { name: 'Dup', email: 'admin@shopkart.test', password: PASSWORD },
      });
      expect(dup.status).toBe(409);
      const injected = await request('POST', '/admins', {
        token: superToken,
        body: { name: 'Root2', email: 'root2@shopkart.test', password: PASSWORD, role: 'superadmin' },
      });
      expect(injected.status).toBe(400);
    });

    it('enforces a strong password for new admins', async () => {
      const res = await request('POST', '/admins', {
        token: superToken,
        body: { name: 'Weak', email: 'weak@shopkart.test', password: 'Passw0rdOk' },
      });
      expect(res.status).toBe(400);
    });

    it('superadmin can list admin accounts only', async () => {
      const res = await request('GET', '/admins', { token: superToken });
      expect(res.status).toBe(200);
      const roles = new Set(res.body.data.map((a: any) => a.role));
      expect([...roles]).toEqual(['admin']);
      expect(res.body.data.map((a: any) => a.email)).toEqual(
        expect.arrayContaining(['admin@shopkart.test', 'store.admin@shopkart.test', 'inactive-admin@shopkart.test']),
      );
      expect(res.body.summary).toEqual({ total: 3, active: 2, inactive: 1 });

      const filtered = await request('GET', '/admins?status=inactive', { token: superToken });
      expect(filtered.body.data.map((a: any) => a.email)).toEqual(['inactive-admin@shopkart.test']);
    });

    it('superadmin can view and update admin details but not their role', async () => {
      expect((await request('GET', `/admins/${createdId}`, { token: superToken })).body.admin.name).toBe('Store Admin');
      const updated = await request('PATCH', `/admins/${createdId}`, { token: superToken, body: { name: 'Lead Admin' } });
      expect(updated.status).toBe(200);
      expect(updated.body.admin.name).toBe('Lead Admin');
      const roleChange = await request('PATCH', `/admins/${createdId}`, { token: superToken, body: { role: 'superadmin' } });
      expect(roleChange.status).toBe(400);
    });

    it('superadmin can deactivate and reactivate an admin; deactivation is immediate', async () => {
      const adminToken = await tokenFor('store.admin@shopkart.test');
      expect((await request('GET', '/auth/admin-only', { token: adminToken })).status).toBe(200);

      const off = await request('PATCH', `/admins/${createdId}/status`, { token: superToken, body: { isActive: false } });
      expect(off.status).toBe(200);
      expect(off.body.admin.isActive).toBe(false);
      expect((await request('GET', '/auth/admin-only', { token: adminToken })).status).toBe(401);
      expect((await login('store.admin@shopkart.test')).status).toBe(401);

      const on = await request('PATCH', `/admins/${createdId}/status`, { token: superToken, body: { isActive: true } });
      expect(on.body.admin.isActive).toBe(true);
      expect((await login('store.admin@shopkart.test')).status).toBe(200);

      const actions = db.auditLogs.filter((l) => l.targetUserId === createdId).map((l) => l.action);
      expect(actions).toEqual(['admin.created', 'admin.updated', 'admin.deactivated', 'admin.activated']);
    });

    it('cannot target customers or superadmins through admin management', async () => {
      for (const id of [ids.customer, ids.superadmin]) {
        expect((await request('PATCH', `/admins/${id}/status`, { token: superToken, body: { isActive: false } })).status).toBe(404);
        expect((await request('PATCH', `/admins/${id}`, { token: superToken, body: { name: 'x' } })).status).toBe(404);
      }
      expect(db.users.find((u) => u.id === ids.superadmin)!.isActive).toBe(true);
    });

    it('validates ids and status payloads', async () => {
      expect((await request('GET', '/admins/not-a-uuid', { token: superToken })).status).toBe(400);
      expect(
        (await request('PATCH', `/admins/${createdId}/status`, { token: superToken, body: { isActive: 'no' } })).status,
      ).toBe(400);
    });

    it('exposes the audit trail to superadmins', async () => {
      const res = await request('GET', '/audit-logs?limit=5', { token: superToken });
      expect(res.status).toBe(200);
      expect(res.body.data[0]).toMatchObject({ action: 'admin.activated' });
      expect(res.body.data[0].actor).toMatchObject({ email: 'superadmin@shopkart.test' });
    });
  });
});
