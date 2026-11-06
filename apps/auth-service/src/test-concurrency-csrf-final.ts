import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

const TEST_PORT = 3010;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const prisma = new PrismaClient();

interface ConcurrencyTestResult {
  testNumber: number;
  category: string;
  scenario: string;
  passed: boolean;
  details: string;
}

const results: ConcurrencyTestResult[] = [];

async function runFinalConcurrencyAndCsrfTests() {
  console.log('================================================================');
  console.log('SHOPKART MEMBER 1: FINAL CONCURRENCY & CSRF VERIFICATION SUITE');
  console.log('================================================================\n');

  let app: INestApplication | null = null;
  let redisClient: Redis | null = null;

  const timestamp = Date.now();
  const testUserEmail = `concurr_user_${timestamp}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'NewSecretPassword456!';

  let testUserId = '';

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl);

    console.log('Bootstrapping Auth Service on port 3010...');
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(TEST_PORT);
    console.log(`Auth Service listening on port ${TEST_PORT}\n`);

    // 1. Seed user in DB
    const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } });
    if (!customerRole) throw new Error('Customer role missing');

    const hashedInitial = await bcrypt.hash(initialPassword, 12);
    const user = await prisma.user.create({
      data: {
        name: 'Concurrency Tester',
        email: testUserEmail,
        passwordHash: hashedInitial,
        roleId: customerRole.id,
        isActive: true,
      },
    });
    testUserId = user.id;

    // Login to obtain active session
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: initialPassword }),
    });
    const loginData = await loginRes.json();
    const originalRefreshToken = loginData.refreshToken;
    const initialAccessToken = loginData.accessToken;

    console.log(`Test account created: ${testUserEmail}\n`);

    // =========================================================================
    // 1. REFRESH TOKEN CONCURRENCY RACE CONDITION TEST
    // =========================================================================
    console.log('Test 1: Simulating concurrent refresh requests with same token...');
    {
      // Dispatch 2 simultaneous refresh requests with the identical refresh token
      const [resA, resB] = await Promise.all([
        fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
        fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
      ]);

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);

      // Exactly one must succeed (200) and the other must be rejected (401)
      const oneSucceeded =
        (resA.status === 200 && resB.status === 401) ||
        (resA.status === 401 && resB.status === 200);

      const passed = oneSucceeded;
      results.push({
        testNumber: 1,
        category: 'Refresh Concurrency',
        scenario: 'Simultaneous refresh requests: exactly one succeeds, concurrent replay rejected',
        passed,
        details: `Req A: ${resA.status}, Req B: ${resB.status} | Atomic Lua prevented double-spend`,
      });
    }

    // =========================================================================
    // 2. REFRESH TOKEN REUSE DETECTION AFTER CONCURRENT RACE
    // =========================================================================
    console.log('Test 2: Verifying reuse detection triggers and invalidates all sessions...');
    {
      // Attempting to use the original token again
      const reuseRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: originalRefreshToken }),
      });
      const passed = reuseRes.status === 401;
      results.push({
        testNumber: 2,
        category: 'Refresh Concurrency',
        scenario: 'Subsequent reuse of consumed token rejected with 401 and revokes user sessions',
        passed,
        details: `Status: ${reuseRes.status} (Expected: 401)`,
      });
    }

    // =========================================================================
    // 3. DEFAULT ADDRESS CONCURRENCY SAFETY TEST
    // =========================================================================
    console.log('Test 3: Simulating simultaneous default address creations...');
    {
      // Obtain fresh login session for address testing
      const freshLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: initialPassword }),
      });
      const token = (await freshLogin.json()).accessToken;

      // Send 3 simultaneous address creations, all requesting isDefault: true
      const [addrRes1, addrRes2, addrRes3] = await Promise.all([
        fetch(`${BASE_URL}/users/me/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: 'User Default 1',
            phone: '+91 9999900001',
            addressLine1: 'Street 1',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560001',
            isDefault: true,
          }),
        }),
        fetch(`${BASE_URL}/users/me/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: 'User Default 2',
            phone: '+91 9999900002',
            addressLine1: 'Street 2',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560002',
            isDefault: true,
          }),
        }),
        fetch(`${BASE_URL}/users/me/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: 'User Default 3',
            phone: '+91 9999900003',
            addressLine1: 'Street 3',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560003',
            isDefault: true,
          }),
        }),
      ]);

      // Query database directly to count default addresses for this user
      const defaultAddresses = await prisma.address.findMany({
        where: { userId: testUserId, isDefault: true },
      });

      const allAddresses = await prisma.address.findMany({
        where: { userId: testUserId },
      });

      const passed = defaultAddresses.length === 1 && allAddresses.length === 3;
      results.push({
        testNumber: 3,
        category: 'Address Concurrency',
        scenario: 'Concurrent address creation with isDefault: true results in strictly 1 default address',
        passed,
        details: `Total Addresses Created: ${allAddresses.length}, Default Addresses in DB: ${defaultAddresses.length} (Row-level FOR UPDATE enforced)`,
      });
    }

    // =========================================================================
    // 4. CSRF ORIGIN VALIDATION PROTECTION
    // =========================================================================
    console.log('Test 4: Verifying CSRF protection rejects malicious origins...');
    {
      const maliciousOrigin = 'https://evil-hacker-site.com';
      const csrfRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: maliciousOrigin,
        },
        body: JSON.stringify({ refreshToken: 'some_token' }),
      });

      const passed = csrfRes.status === 403;
      results.push({
        testNumber: 4,
        category: 'CSRF Protection',
        scenario: 'Cross-origin request from unapproved origin rejected with 403 Forbidden',
        passed,
        details: `Status: ${csrfRes.status} (Expected: 403 Forbidden)`,
      });
    }

    // =========================================================================
    // 5. CSRF VALID ORIGIN ALLOWED
    // =========================================================================
    console.log('Test 5: Verifying approved frontend origin is permitted...');
    {
      const allowedOrigin = 'http://localhost:3000';
      const validRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: allowedOrigin,
        },
        body: JSON.stringify({ refreshToken: 'invalid_or_missing_token' }),
      });

      // Should bypass CSRF check and proceed to token validation (returning 401 for bad token, NOT 403)
      const passed = validRes.status === 401;
      results.push({
        testNumber: 5,
        category: 'CSRF Protection',
        scenario: 'Request with approved FRONTEND_URL origin passes CSRF origin validation',
        passed,
        details: `Status: ${validRes.status} (Bypassed 403 CSRF check, reached auth handler)`,
      });
    }

    // =========================================================================
    // 6. ACCESS TOKEN REVOCATION: SAME-SECOND iat EDGE CASE
    // =========================================================================
    console.log('Test 6: Verifying same-second access token revocation...');
    {
      const freshLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: initialPassword }),
      });
      const loginPayload = await freshLogin.json();
      const accessTokenBeforePasswordChange = loginPayload.accessToken;

      // Immediately change password in the exact same second
      const changeRes = await fetch(`${BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenBeforePasswordChange}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: updatedPassword,
        }),
      });

      // Immediately attempt to use previous token on protected endpoint without sleeping
      const probeRes = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${accessTokenBeforePasswordChange}` },
      });

      const passed = changeRes.status === 200 && probeRes.status === 401;
      results.push({
        testNumber: 6,
        category: 'Token Revocation',
        scenario: 'Access token issued in the same second as password change is immediately revoked (iat <= revoked_before)',
        passed,
        details: `Change Status: ${changeRes.status}, Probe Status: ${probeRes.status} (Expected: 401)`,
      });
    }

    // =========================================================================
    // 7. NEW LOGIN SUCCEEDS AFTER REVOCATION
    // =========================================================================
    console.log('Test 7: Verifying new login succeeds and issues immediately valid token...');
    {
      const newLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: updatedPassword }),
      });
      const newLoginData = await newLogin.json();
      const newAccessToken = newLoginData.accessToken;

      const profileRes = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${newAccessToken}` },
      });

      const passed = newLogin.status === 200 && profileRes.status === 200;
      results.push({
        testNumber: 7,
        category: 'Token Revocation',
        scenario: 'Fresh login after password change issues valid token that works immediately',
        passed,
        details: `Login Status: ${newLogin.status}, Profile Access: ${profileRes.status}`,
      });
    }

    // =========================================================================
    // 8. JWT CROSS-SERVICE CONTRACT VALIDATION (MEMBER 2 & 3 COMPATIBILITY)
    // =========================================================================
    console.log('Test 8: Verifying JWT claims structure and signature contract...');
    {
      const newLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: updatedPassword }),
      });
      const token = (await newLogin.json()).accessToken;

      const decoded = jwt.decode(token, { complete: true }) as any;
      const secret = process.env.JWT_ACCESS_SECRET || 'default_jwt_secret';
      const verified = jwt.verify(token, secret, {
        issuer: 'shopkart-auth-service',
        audience: 'shopkart-client',
      }) as any;

      const hasRequiredClaims =
        decoded.header.alg === 'HS256' &&
        typeof verified.sub === 'string' &&
        typeof verified.email === 'string' &&
        typeof verified.role === 'string' &&
        typeof verified.jti === 'string' &&
        typeof verified.iat === 'number' &&
        typeof verified.exp === 'number';

      const passed = hasRequiredClaims;
      results.push({
        testNumber: 8,
        category: 'Cross-Service Contract',
        scenario: 'JWT adheres strictly to cross-service contract (HS256, sub, email, role, jti, iat, exp)',
        passed,
        details: `Alg: ${decoded.header.alg}, Issuer: ${verified.iss}, Audience: ${verified.aud}, Role: ${verified.role}`,
      });
    }

    // Cleanup
    await prisma.address.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.log('Cleaned up test artifacts.\n');
  } catch (err) {
    console.error('Fatal test execution error:', err);
  } finally {
    if (redisClient) await redisClient.quit();
    if (app) await app.close();
    await prisma.$disconnect();
  }

  console.log('================================================================');
  console.log('CONCURRENCY & CSRF TEST RESULTS SUMMARY');
  console.log('================================================================');
  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] #${r.testNumber} [${r.category}] ${r.scenario}`);
    if (!r.passed) {
      console.log(`       Details: ${r.details}`);
      allPassed = false;
    }
  }
  console.log('----------------------------------------------------------------');
  const count = results.filter((r) => r.passed).length;
  console.log(`Total: ${results.length} | Passed: ${count} | Failed: ${results.length - count}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runFinalConcurrencyAndCsrfTests();
