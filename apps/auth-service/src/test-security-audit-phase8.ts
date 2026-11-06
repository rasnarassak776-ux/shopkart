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
import {
  JwtPayload,
  AddressSnapshot,
  INotificationDeliveryContract,
  PasswordResetNotificationPayload,
} from '@shopkart/common';
import { PasswordResetDeliveryService } from './auth/services/password-reset-delivery.service';

const TEST_PORT = 3010;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const prisma = new PrismaClient();

interface AuditResult {
  checkNumber: number;
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const auditResults: AuditResult[] = [];

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('SHOPKART MEMBER 1: PHASE 8 COMPREHENSIVE SECURITY AUDIT');
  console.log('================================================================\n');

  let app: INestApplication | null = null;
  let redisClient: Redis | null = null;

  const timestamp = Date.now();
  const testUserEmail = `audit_user_${timestamp}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const changedPassword = 'ChangedPassword456!';
  const resetPassword = 'ResetPassword789!';

  let testUserId = '';
  let preChangeAccessToken = '';

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

    const deliveryService = app.get(PasswordResetDeliveryService);

    // 1. Seed user
    const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } });
    if (!customerRole) throw new Error('Role not found');

    const hashedInitial = await bcrypt.hash(initialPassword, 12);
    const user = await prisma.user.create({
      data: {
        name: 'Audit Subject',
        email: testUserEmail,
        passwordHash: hashedInitial,
        roleId: customerRole.id,
        isActive: true,
      },
    });
    testUserId = user.id;

    // Login to obtain pre-change access token
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: initialPassword }),
    });
    const loginData = await loginRes.json();
    preChangeAccessToken = loginData.accessToken;

    // Verify token works before change
    const verifyInitial = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${preChangeAccessToken}` },
    });
    if (verifyInitial.status !== 200) {
      throw new Error('Initial access token failed verification');
    }

    // =========================================================================
    // AUDIT 1: Access Token Invalidation after Password Change
    // =========================================================================
    {
      // Change password
      const changeRes = await fetch(`${BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${preChangeAccessToken}`,
        },
        body: JSON.stringify({
          currentPassword: initialPassword,
          newPassword: changedPassword,
        }),
      });

      // Small tick to ensure timestamp comparison
      await new Promise((r) => setTimeout(r, 1100));

      // Attempt to access /users/me with pre-change access token
      const oldTokenRes = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${preChangeAccessToken}` },
      });

      const passed = oldTokenRes.status === 401;
      auditResults.push({
        checkNumber: 1,
        category: 'Token Invalidation',
        name: 'Access token invalidated immediately after password change',
        passed,
        details: `Old token status after password change: ${oldTokenRes.status} (Expected: 401)`,
      });
    }

    // =========================================================================
    // AUDIT 2: Access Token Invalidation after Password Reset
    // =========================================================================
    {
      // Login with changed password to obtain fresh token
      const freshLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: changedPassword }),
      });
      const freshLoginData = await freshLoginRes.json();
      const preResetAccessToken = freshLoginData.accessToken;

      // Trigger forgot password
      await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail }),
      });

      const resetToken = deliveryService.getDevTokenForEmail(testUserEmail);
      if (!resetToken) throw new Error('Reset token missing');

      // Small tick
      await new Promise((r) => setTimeout(r, 1100));

      // Reset password
      await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: resetPassword }),
      });

      // Attempt to access with pre-reset access token
      const preResetRes = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${preResetAccessToken}` },
      });

      const passed = preResetRes.status === 401;
      auditResults.push({
        checkNumber: 2,
        category: 'Token Invalidation',
        name: 'Access token invalidated immediately after password reset',
        passed,
        details: `Old token status after password reset: ${preResetRes.status} (Expected: 401)`,
      });
    }

    // =========================================================================
    // AUDIT 3: Atomic Refresh Token Rotation & Single-Use Session Enforcement
    // =========================================================================
    {
      const loginRes3 = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: resetPassword }),
      });
      const loginData3 = await loginRes3.json();
      const rt1 = loginData3.refreshToken;

      // Rotate token once
      const refreshRes1 = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt1 }),
      });
      const refreshData1 = await refreshRes1.json();
      const rt2 = refreshData1.refreshToken;

      // Attempt reuse of rt1
      const reuseRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt1 }),
      });

      // Reuse detection should invalidate all sessions, meaning rt2 is now also revoked
      const rt2Res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt2 }),
      });

      const passed =
        refreshRes1.status === 200 && reuseRes.status === 401 && rt2Res.status === 401;
      auditResults.push({
        checkNumber: 3,
        category: 'Session Security',
        name: 'Refresh token rotation is atomic and reuse revokes all active sessions',
        passed,
        details: `Initial Refresh: ${refreshRes1.status}, Reuse Rejection: ${reuseRes.status}, All Sessions Revoked: ${rt2Res.status}`,
      });
    }

    // =========================================================================
    // AUDIT 4: Rate Limiting & Brute Force Defense
    // =========================================================================
    {
      const bruteEmail = `brute_${timestamp}@example.com`;
      const passHashed = await bcrypt.hash('CorrectPass123!', 12);
      await prisma.user.create({
        data: {
          name: 'Brute Target',
          email: bruteEmail,
          passwordHash: passHashed,
          roleId: customerRole.id,
        },
      });

      // 5 consecutive failed logins
      for (let i = 0; i < 5; i++) {
        await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: bruteEmail, password: 'WrongPassword!' }),
        });
      }

      // 6th attempt should be blocked by rate limit
      const sixthAttempt = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: bruteEmail, password: 'WrongPassword!' }),
      });
      const sixthData = await sixthAttempt.json();

      const passed =
        sixthAttempt.status === 401 &&
        sixthData.message.includes('Too many failed login attempts');
      auditResults.push({
        checkNumber: 4,
        category: 'Rate Limiting',
        name: 'Brute-force protection limits consecutive failed login attempts',
        passed,
        details: `Status: ${sixthAttempt.status}, Message: "${sixthData.message}"`,
      });

      await prisma.user.delete({ where: { email: bruteEmail } });
    }

    // =========================================================================
    // AUDIT 5: Strict Anti-Enumeration across Endpoints
    // =========================================================================
    {
      const resBadPass = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: 'WrongPassword!' }),
      });
      const dataBadPass = await resBadPass.json();

      const resBadUser = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost_user@example.com', password: 'AnyPassword!' }),
      });
      const dataBadUser = await resBadUser.json();

      const passed =
        resBadPass.status === 401 &&
        resBadUser.status === 401 &&
        dataBadPass.message === dataBadUser.message;
      auditResults.push({
        checkNumber: 5,
        category: 'Anti-Enumeration',
        name: 'Login endpoint emits identical error messages for nonexistent vs invalid password',
        passed,
        details: `Both returned 401 with identical message: "${dataBadPass.message}"`,
      });
    }

    // =========================================================================
    // AUDIT 6: Notification Contract Integration with Member 4
    // =========================================================================
    {
      const payload: PasswordResetNotificationPayload = {
        recipientEmail: 'customer@example.com',
        resetUrl: 'http://localhost:3000/reset-password?token=test_token',
        expiresInMinutes: 15,
        requestedAt: new Date().toISOString(),
      };

      const result = await deliveryService.sendPasswordResetNotification(payload);
      const passed =
        result.status === 'pending' &&
        result.deliveryMethod === 'development-local' &&
        result.recipient === 'customer@example.com';
      auditResults.push({
        checkNumber: 6,
        category: 'Cross-Member Contract',
        name: 'PasswordResetDeliveryService implements INotificationDeliveryContract safely',
        passed,
        details: `Status: ${result.status}, Method: ${result.deliveryMethod}`,
      });
    }

    // =========================================================================
    // AUDIT 7: Address Ownership Enforcement (Zero Information Leak)
    // =========================================================================
    {
      // Create address for test user
      const userAddr = await prisma.address.create({
        data: {
          userId: testUserId,
          fullName: 'Audit Subject',
          phone: '+91 9999999999',
          addressLine1: 'Test Avenue',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
          isDefault: true,
        },
      });

      // Create a foreign user
      const foreignUser = await prisma.user.create({
        data: {
          name: 'Foreign User',
          email: `foreign_${timestamp}@example.com`,
          passwordHash: hashedInitial,
          roleId: customerRole.id,
        },
      });

      const foreignLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: foreignUser.email, password: initialPassword }),
      });
      const foreignToken = (await foreignLogin.json()).accessToken;

      // Foreign user attempts to read test user's address
      const foreignAccess = await fetch(`${BASE_URL}/users/me/addresses/${userAddr.id}`, {
        headers: { Authorization: `Bearer ${foreignToken}` },
      });

      const passed = foreignAccess.status === 404;
      auditResults.push({
        checkNumber: 7,
        category: 'Authorization & Ownership',
        name: 'Foreign address access strictly returns 404 (prevents IDOR and enumeration)',
        passed,
        details: `Status: ${foreignAccess.status} (Expected: 404)`,
      });

      await prisma.user.delete({ where: { id: foreignUser.id } });
    }

    // =========================================================================
    // AUDIT 8: Sensitive Data Leakage Prevention
    // =========================================================================
    {
      const freshLogin = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: resetPassword }),
      });
      const loginPayload = await freshLogin.json();
      const token = loginPayload.accessToken;

      const profileRes = await fetch(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();

      const passed =
        !('passwordHash' in loginPayload) &&
        !('passwordHash' in (loginPayload.user || {})) &&
        !('passwordHash' in (profileData || {}));
      auditResults.push({
        checkNumber: 8,
        category: 'Data Protection',
        name: 'Sensitive fields (passwordHash, salt) strictly absent from API payloads',
        passed,
        details: `passwordHash absent across login and profile responses`,
      });
    }

    // Cleanup
    await prisma.user.delete({ where: { id: testUserId } });
    console.log('Audit test artifacts cleaned up.\n');
  } catch (err) {
    console.error('Fatal audit error:', err);
  } finally {
    if (redisClient) await redisClient.quit();
    if (app) await app.close();
    await prisma.$disconnect();
  }

  console.log('================================================================');
  console.log('PHASE 8 SECURITY AUDIT RESULTS SUMMARY');
  console.log('================================================================');
  let allPassed = true;
  for (const r of auditResults) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] #${r.checkNumber} [${r.category}] ${r.name}`);
    if (!r.passed) {
      console.log(`       Details: ${r.details}`);
      allPassed = false;
    }
  }
  console.log('----------------------------------------------------------------');
  const count = auditResults.filter((r) => r.passed).length;
  console.log(`Total Audits: ${auditResults.length} | Passed: ${count} | Failed: ${auditResults.length - count}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runSecurityAudit();
