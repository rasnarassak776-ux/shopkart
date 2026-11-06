import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PasswordResetDeliveryService } from './auth/services/password-reset-delivery.service';

const TEST_PORT = 3010;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const prisma = new PrismaClient();

interface TestResult {
  testNumber: number;
  category: 'Anti-Enumeration' | 'Token & Redis' | 'Reset Execution' | 'Security & Sessions';
  scenario: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function runPhase7Tests() {
  console.log('====================================================');
  console.log('SHOPKART MEMBER 1: PHASE 7 PASSWORD RECOVERY TESTS');
  console.log('====================================================\n');

  let app: INestApplication | null = null;
  let redisClient: Redis | null = null;

  const timestamp = Date.now();
  const activeUserEmail = `test_p7_active_${timestamp}@example.com`;
  const inactiveUserEmail = `test_p7_inactive_${timestamp}@example.com`;
  const nonexistentEmail = `test_p7_nonexistent_${timestamp}@example.com`;
  const originalPassword = 'OldPassword123!';
  const newStrongPassword = 'NewSecretPassword456!';

  let activeUserId = '';
  let inactiveUserId = '';
  let activeUserToken = '';

  try {
    // 1. Initialize Redis connection for direct inspection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl);

    // 2. Bootstrap NestJS Auth Microservice
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

    const deliveryService = app.get(PasswordResetDeliveryService);

    // 3. Seed test users
    console.log('Setting up test accounts in database...');
    const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } });
    if (!customerRole) {
      throw new Error('Database not seeded: customer role missing');
    }

    const hashedOriginal = await bcrypt.hash(originalPassword, 12);

    const activeUser = await prisma.user.create({
      data: {
        name: 'Phase 7 Active Tester',
        email: activeUserEmail,
        passwordHash: hashedOriginal,
        roleId: customerRole.id,
        isActive: true,
      },
    });
    activeUserId = activeUser.id;

    const inactiveUser = await prisma.user.create({
      data: {
        name: 'Phase 7 Inactive Tester',
        email: inactiveUserEmail,
        passwordHash: hashedOriginal,
        roleId: customerRole.id,
        isActive: false,
      },
    });
    inactiveUserId = inactiveUser.id;

    // Login active user to establish an active session before password reset
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: activeUserEmail,
        password: originalPassword,
      }),
    });
    const loginData = await loginRes.json();
    const activeUserRefreshToken = loginData.refreshToken;

    console.log(`Test users created: Active (${activeUserEmail}), Inactive (${inactiveUserEmail})\n`);

    // =========================================================================
    // TEST 1: Anti-Enumeration with Existing Active Email
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: activeUserEmail }),
      });
      const data = await res.json();
      const passed =
        res.status === 200 &&
        data.success === true &&
        data.message ===
          'If an account exists with this email, password recovery instructions will be sent.';
      results.push({
        testNumber: 1,
        category: 'Anti-Enumeration',
        scenario: 'Existing active user forgot-password returns generic message',
        passed,
        details: `Status: ${res.status}, Message: "${data.message}"`,
      });
    }

    // =========================================================================
    // TEST 2: Anti-Enumeration with Non-Existent Email
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonexistentEmail }),
      });
      const data = await res.json();
      const passed =
        res.status === 200 &&
        data.success === true &&
        data.message ===
          'If an account exists with this email, password recovery instructions will be sent.';
      results.push({
        testNumber: 2,
        category: 'Anti-Enumeration',
        scenario: 'Non-existent email returns identical generic message (anti-enumeration)',
        passed,
        details: `Status: ${res.status}, Identical response verified`,
      });
    }

    // =========================================================================
    // TEST 3: Anti-Enumeration with Inactive Account
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inactiveUserEmail }),
      });
      const data = await res.json();
      const passed =
        res.status === 200 &&
        data.success === true &&
        data.message ===
          'If an account exists with this email, password recovery instructions will be sent.';
      results.push({
        testNumber: 3,
        category: 'Anti-Enumeration',
        scenario: 'Deactivated account returns identical generic message',
        passed,
        details: `Status: ${res.status}, Message: "${data.message}"`,
      });
    }

    // =========================================================================
    // TEST 4: Nonexistent email generates NO token in Redis
    // =========================================================================
    {
      const devToken = deliveryService.getDevTokenForEmail(nonexistentEmail);
      const passed = devToken === undefined;
      results.push({
        testNumber: 4,
        category: 'Token & Redis',
        scenario: 'No recovery token generated or delivered for nonexistent email',
        passed,
        details: `DevToken: ${devToken ?? 'undefined (correct)'}`,
      });
    }

    // =========================================================================
    // TEST 5: Inactive user generates NO token in Redis
    // =========================================================================
    {
      const devToken = deliveryService.getDevTokenForEmail(inactiveUserEmail);
      const passed = devToken === undefined;
      results.push({
        testNumber: 5,
        category: 'Token & Redis',
        scenario: 'No recovery token generated or delivered for inactive account',
        passed,
        details: `DevToken: ${devToken ?? 'undefined (correct)'}`,
      });
    }

    // =========================================================================
    // TEST 6: Validation: Invalid email format rejected with 400
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      });
      const passed = res.status === 400;
      results.push({
        testNumber: 6,
        category: 'Anti-Enumeration',
        scenario: 'Invalid email format rejected with 400 Bad Request',
        passed,
        details: `Status: ${res.status}`,
      });
    }

    // =========================================================================
    // TEST 7: Validation: Empty email rejected with 400
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      });
      const passed = res.status === 400;
      results.push({
        testNumber: 7,
        category: 'Anti-Enumeration',
        scenario: 'Empty email rejected with 400 Bad Request',
        passed,
        details: `Status: ${res.status}`,
      });
    }

    // =========================================================================
    // TEST 8: Token structure and length (32 bytes = 64 hex characters)
    // =========================================================================
    activeUserToken = deliveryService.getDevTokenForEmail(activeUserEmail) || '';
    {
      const passed =
        typeof activeUserToken === 'string' &&
        activeUserToken.length === 64 &&
        /^[0-9a-f]{64}$/i.test(activeUserToken);
      results.push({
        testNumber: 8,
        category: 'Token & Redis',
        scenario: 'Token is cryptographically secure 32-byte hex string (64 chars)',
        passed,
        details: `Length: ${activeUserToken.length}, Hex: ${passed}`,
      });
    }

    // =========================================================================
    // TEST 9: SHA-256 hash stored in Redis (Raw token NOT stored)
    // =========================================================================
    const tokenHash = crypto.createHash('sha256').update(activeUserToken).digest('hex');
    const resetKey = `auth:reset_token:${tokenHash}`;
    let storedPayload: any = null;
    {
      const rawStored = await redisClient.get(activeUserToken); // Checking if raw token was mistakenly used as key
      const hashStored = await redisClient.get(resetKey);

      if (hashStored) {
        storedPayload = JSON.parse(hashStored);
      }

      const passed =
        rawStored === null &&
        hashStored !== null &&
        storedPayload?.userId === activeUserId &&
        storedPayload?.email === activeUserEmail;
      results.push({
        testNumber: 9,
        category: 'Token & Redis',
        scenario: 'Redis stores SHA-256 hashed token with user ID and email payload',
        passed,
        details: `Raw stored: ${rawStored === null ? 'no (correct)' : 'LEAKED'}, Key: ${resetKey}`,
      });
    }

    // =========================================================================
    // TEST 10: Redis TTL is ~15 minutes (900 seconds)
    // =========================================================================
    {
      const ttl = await redisClient.ttl(resetKey);
      const passed = ttl > 800 && ttl <= 900;
      results.push({
        testNumber: 10,
        category: 'Token & Redis',
        scenario: 'Reset token key has 15-minute TTL (900 seconds)',
        passed,
        details: `TTL: ${ttl}s (Expected: 800-900s)`,
      });
    }

    // =========================================================================
    // TEST 11: Rate-limiting key set with 60s TTL
    // =========================================================================
    {
      const rateKey = `auth:reset_rate_limit:${activeUserEmail.toLowerCase()}`;
      const rateVal = await redisClient.get(rateKey);
      const rateTtl = await redisClient.ttl(rateKey);
      const passed = rateVal === '1' && rateTtl > 0 && rateTtl <= 60;
      results.push({
        testNumber: 11,
        category: 'Token & Redis',
        scenario: 'Rate limit cooldown key set in Redis with 60s TTL',
        passed,
        details: `RateVal: ${rateVal}, TTL: ${rateTtl}s`,
      });
    }

    // =========================================================================
    // TEST 12: Delivery abstraction logs and stashes dev token safely
    // =========================================================================
    {
      const deliveryResult = await deliveryService.sendPasswordResetLink(
        activeUserEmail,
        activeUserToken,
      );
      // In dev mode, delivered must be false ("Never claim delivery succeeded when it did not")
      const passed =
        deliveryResult.delivered === false &&
        deliveryResult.deliveryMethod === 'development-local';
      results.push({
        testNumber: 12,
        category: 'Token & Redis',
        scenario: 'Delivery abstraction marks external dispatch pending in development mode',
        passed,
        details: `Delivered: ${deliveryResult.delivered}, Method: ${deliveryResult.deliveryMethod}`,
      });
    }

    // =========================================================================
    // TEST 13: Reset Password: Empty token rejected with 400
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: '',
          newPassword: newStrongPassword,
        }),
      });
      const passed = res.status === 400;
      results.push({
        testNumber: 13,
        category: 'Reset Execution',
        scenario: 'Reset password with empty token rejected with 400',
        passed,
        details: `Status: ${res.status}`,
      });
    }

    // =========================================================================
    // TEST 14: Reset Password: Weak password rejected with 400
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeUserToken,
          newPassword: 'weak',
        }),
      });
      const passed = res.status === 400;
      results.push({
        testNumber: 14,
        category: 'Reset Execution',
        scenario: 'Weak password policy enforcement rejected with 400',
        passed,
        details: `Status: ${res.status}`,
      });
    }

    // =========================================================================
    // TEST 15: Reset Password: Invalid / fake token rejected with 400
    // =========================================================================
    {
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: fakeToken,
          newPassword: newStrongPassword,
        }),
      });
      const data = await res.json();
      const passed =
        res.status === 400 && data.message === 'Invalid or expired password reset token.';
      results.push({
        testNumber: 15,
        category: 'Reset Execution',
        scenario: 'Invalid or expired token returns 400 with specific message',
        passed,
        details: `Status: ${res.status}, Message: "${data.message}"`,
      });
    }

    // =========================================================================
    // TEST 16: Reset Password: Valid token updates password successfully
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeUserToken,
          newPassword: newStrongPassword,
        }),
      });
      const data = await res.json();
      const passed =
        res.status === 200 &&
        data.success === true &&
        data.message.includes('Password has been reset successfully');
      results.push({
        testNumber: 16,
        category: 'Reset Execution',
        scenario: 'Valid token resets password successfully (HTTP 200)',
        passed,
        details: `Status: ${res.status}, Message: "${data.message}"`,
      });
    }

    // =========================================================================
    // TEST 17: Database Verification: Password hash updated and matches bcryptjs (cost 12)
    // =========================================================================
    {
      const updatedUser = await prisma.user.findUnique({ where: { id: activeUserId } });
      const matchesNew = updatedUser
        ? await bcrypt.compare(newStrongPassword, updatedUser.passwordHash)
        : false;
      const matchesOld = updatedUser
        ? await bcrypt.compare(originalPassword, updatedUser.passwordHash)
        : false;
      const passed = Boolean(
        matchesNew === true &&
        matchesOld === false &&
        (updatedUser?.passwordHash?.startsWith('$2a$12$') ||
          updatedUser?.passwordHash?.startsWith('$2b$12$')),
      );
      results.push({
        testNumber: 17,
        category: 'Reset Execution',
        scenario: 'Database passwordHash updated with bcryptjs cost 12 and verifies new password',
        passed,
        details: `Matches new: ${matchesNew}, Matches old: ${matchesOld}, Hash: ${updatedUser?.passwordHash.substring(0, 10)}...`,
      });
    }

    // =========================================================================
    // TEST 18: Single-Use Enforcement: Reusing token fails (Atomic Consumption)
    // =========================================================================
    {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeUserToken,
          newPassword: 'AnotherPassword789!',
        }),
      });
      const data = await res.json();
      const passed =
        res.status === 400 && data.message === 'Invalid or expired password reset token.';
      results.push({
        testNumber: 18,
        category: 'Security & Sessions',
        scenario: 'Single-use enforcement: Reusing token fails with 400 (Atomic Lua DEL)',
        passed,
        details: `Status: ${res.status}, Message: "${data.message}"`,
      });
    }

    // =========================================================================
    // TEST 19: Session Invalidation: Active sessions revoked upon password reset
    // =========================================================================
    {
      // Attempt to refresh token using the pre-existing session
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: activeUserRefreshToken }),
      });
      const passed = refreshRes.status === 401;
      results.push({
        testNumber: 19,
        category: 'Security & Sessions',
        scenario: 'All existing refresh sessions revoked immediately after password reset',
        passed,
        details: `Old session refresh status: ${refreshRes.status} (Expected: 401)`,
      });
    }

    // =========================================================================
    // TEST 20: Login Verification: Old password rejected, new password accepted
    // =========================================================================
    {
      const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeUserEmail,
          password: originalPassword,
        }),
      });

      const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activeUserEmail,
          password: newStrongPassword,
        }),
      });
      const newLoginData = await newLoginRes.json();

      const passed =
        oldLoginRes.status === 401 &&
        newLoginRes.status === 200 &&
        newLoginData.success === true &&
        typeof newLoginData.accessToken === 'string';

      results.push({
        testNumber: 20,
        category: 'Security & Sessions',
        scenario: 'Login with old password rejected (401), login with new password succeeds (200)',
        passed,
        details: `Old login status: ${oldLoginRes.status}, New login status: ${newLoginRes.status}`,
      });
    }

    // Cleanup test users from DB
    await prisma.user.deleteMany({
      where: { id: { in: [activeUserId, inactiveUserId] } },
    });
    console.log('Test accounts cleaned up from database.');
  } catch (err) {
    console.error('Fatal test execution error:', err);
  } finally {
    if (redisClient) {
      await redisClient.quit();
    }
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  }

  // Summary report
  console.log('\n====================================================');
  console.log('PHASE 7 TEST RESULTS SUMMARY');
  console.log('====================================================');
  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] #${r.testNumber} [${r.category}] ${r.scenario}`);
    if (!r.passed) {
      console.log(`       Details: ${r.details}`);
      allPassed = false;
    }
  }

  console.log('----------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Tests: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  console.log('====================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase7Tests();
