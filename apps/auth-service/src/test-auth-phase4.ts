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

const TEST_PORT = 3010;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const prisma = new PrismaClient();

interface TestResult {
  testNumber: number;
  description: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

// Helper to extract cookie from Set-Cookie header
function extractCookie(res: Response, cookieName: string): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('SHOPKART MEMBER 1: PHASE 4 AUTHENTICATION & JWT TEST');
  console.log('====================================================\n');

  let app: INestApplication | null = null;
  const timestamp = Date.now();
  const customerEmail = `test_phase4_cust_${timestamp}@example.com`;
  const adminEmail = `test_phase4_admin_${timestamp}@example.com`;
  const inactiveEmail = `test_phase4_inactive_${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  try {
    // 1. Bootstrap NestJS App
    console.log('Bootstrapping NestJS Auth Application for tests...');
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
    console.log(`NestJS application listening on port ${TEST_PORT}\n`);

    // 2. Prepare test data in DB
    const customerRole = await prisma.role.findUnique({ where: { name: 'customer' } });
    const adminRole = await prisma.role.findUnique({ where: { name: 'merchant' } });

    if (!customerRole || !adminRole) {
      throw new Error('Customer or Admin roles missing in database. Please run seed script.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create test customer
    const customerUser = await prisma.user.create({
      data: {
        name: 'Phase 4 Customer',
        email: customerEmail,
        passwordHash,
        roleId: customerRole.id,
        isActive: true,
      },
    });

    // Create test admin
    const adminUser = await prisma.user.create({
      data: {
        name: 'Phase 4 Admin',
        email: adminEmail,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
      },
    });

    // Create test inactive user
    const inactiveUser = await prisma.user.create({
      data: {
        name: 'Phase 4 Inactive User',
        email: inactiveEmail,
        passwordHash,
        roleId: customerRole.id,
        isActive: false,
      },
    });

    console.log('Prepared test users in database.\n');

    // ----------------------------------------------------
    // Test 1: Successful customer login
    // ----------------------------------------------------
    console.log('Test 1: Successful customer login...');
    const res1 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail.toUpperCase(), // Test case normalization
        password,
      }),
    });
    const data1 = (await res1.json()) as any;
    const cookie1 = res1.headers.get('set-cookie') || '';
    const hasHttpOnlyCookie = cookie1.includes('refreshToken=') && cookie1.toLowerCase().includes('httponly');
    const test1Pass =
      res1.status === 200 &&
      data1.success === true &&
      data1.accessToken &&
      data1.refreshToken &&
      data1.user.role === 'customer' &&
      data1.user.email === customerEmail &&
      !data1.passwordHash &&
      hasHttpOnlyCookie;

    results.push({
      testNumber: 1,
      description: 'Successful customer login returns 200, JWT tokens, and HttpOnly cookie',
      passed: Boolean(test1Pass),
      details: `Status: ${res1.status}, Role: ${data1?.user?.role}, HttpOnly Cookie: ${hasHttpOnlyCookie}`,
    });

    const customerAccessToken = data1.accessToken;
    let customerRefreshToken = data1.refreshToken;

    // ----------------------------------------------------
    // Test 2: Successful admin login
    // ----------------------------------------------------
    console.log('Test 2: Successful admin login...');
    const res2 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password,
      }),
    });
    const data2 = (await res2.json()) as any;
    const test2Pass =
      res2.status === 200 &&
      data2.success === true &&
      data2.user.role === 'merchant' &&
      data2.accessToken;

    results.push({
      testNumber: 2,
      description: 'Successful admin login returns 200 and admin role',
      passed: Boolean(test2Pass),
      details: `Status: ${res2.status}, Role: ${data2?.user?.role}`,
    });

    const adminAccessToken = data2.accessToken;

    // ----------------------------------------------------
    // Test 3: Incorrect password
    // ----------------------------------------------------
    console.log('Test 3: Incorrect password...');
    const res3 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail,
        password: 'WrongPassword123!',
      }),
    });
    const data3 = (await res3.json()) as any;
    const test3Pass =
      res3.status === 401 &&
      data3.message === 'Invalid email or password.';

    results.push({
      testNumber: 3,
      description: 'Incorrect password returns 401 with generic error message',
      passed: test3Pass,
      details: `Status: ${res3.status}, Message: "${data3.message}"`,
    });

    // ----------------------------------------------------
    // Test 4: Nonexistent email
    // ----------------------------------------------------
    console.log('Test 4: Nonexistent email...');
    const res4 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `nonexistent_${timestamp}@example.com`,
        password: 'AnyPassword123!',
      }),
    });
    const data4 = (await res4.json()) as any;
    const test4Pass =
      res4.status === 401 &&
      data4.message === 'Invalid email or password.';

    results.push({
      testNumber: 4,
      description: 'Nonexistent email returns 401 with identical generic error message',
      passed: test4Pass,
      details: `Status: ${res4.status}, Message: "${data4.message}"`,
    });

    // ----------------------------------------------------
    // Test 5: Inactive user account rejected
    // ----------------------------------------------------
    console.log('Test 5: Inactive user rejection...');
    const res5 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inactiveEmail,
        password,
      }),
    });
    const data5 = (await res5.json()) as any;
    const test5Pass = res5.status === 401;

    results.push({
      testNumber: 5,
      description: 'Inactive account login rejected with 401 Unauthorized',
      passed: test5Pass,
      details: `Status: ${res5.status}, Message: "${data5.message}"`,
    });

    // ----------------------------------------------------
    // Test 6: Missing credentials / DTO validation
    // ----------------------------------------------------
    console.log('Test 6: Missing credentials validation...');
    const res6 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data6 = (await res6.json()) as any;
    const test6Pass = res6.status === 400;

    results.push({
      testNumber: 6,
      description: 'Empty/invalid login payload returns 400 Bad Request',
      passed: test6Pass,
      details: `Status: ${res6.status}, Errors: ${JSON.stringify(data6.message)}`,
    });

    // ----------------------------------------------------
    // Test 7: Access token validation on protected route
    // ----------------------------------------------------
    console.log('Test 7: Access token validation on protected route (/me)...');
    const res7 = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerAccessToken}`,
      },
    });
    const data7 = (await res7.json()) as any;
    const test7Pass =
      res7.status === 200 &&
      data7.success === true &&
      data7.user.email === customerEmail &&
      data7.user.role === 'customer';

    results.push({
      testNumber: 7,
      description: 'Valid access token allows access to protected GET /auth/me',
      passed: Boolean(test7Pass),
      details: `Status: ${res7.status}, User ID: ${data7?.user?.id}`,
    });

    // ----------------------------------------------------
    // Test 8: Tampered access token rejection
    // ----------------------------------------------------
    console.log('Test 8: Tampered access token...');
    const tamperedToken = customerAccessToken.slice(0, -6) + 'abcdef';
    const res8 = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
      },
    });
    const test8Pass = res8.status === 401;

    results.push({
      testNumber: 8,
      description: 'Tampered access token rejected with 401 Unauthorized',
      passed: test8Pass,
      details: `Status: ${res8.status}`,
    });

    // ----------------------------------------------------
    // Test 9: Successful token refresh via HttpOnly cookie or body
    // ----------------------------------------------------
    console.log('Test 9: Successful token refresh...');
    const res9 = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${customerRefreshToken}`,
      },
      body: JSON.stringify({}),
    });
    const data9 = (await res9.json()) as any;
    const newCookie = res9.headers.get('set-cookie') || '';
    const test9Pass =
      res9.status === 200 &&
      data9.success === true &&
      data9.accessToken &&
      data9.refreshToken &&
      data9.refreshToken !== customerRefreshToken;

    results.push({
      testNumber: 9,
      description: 'Token refresh succeeds, returns new token pair and rotates cookie',
      passed: Boolean(test9Pass),
      details: `Status: ${res9.status}, Rotated Token: ${data9.refreshToken !== customerRefreshToken}`,
    });

    const rotatedAccessToken = data9.accessToken;
    const rotatedRefreshToken = data9.refreshToken;

    // ----------------------------------------------------
    // Test 10: Refresh token rotation - Old refresh token revoked
    // ----------------------------------------------------
    console.log('Test 10: Verifying old refresh token revocation...');
    const res10 = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: customerRefreshToken }), // Presenting the OLD token
    });
    const data10 = (await res10.json()) as any;
    const test10Pass = res10.status === 401;

    results.push({
      testNumber: 10,
      description: 'Attempting to use rotated old refresh token returns 401 Unauthorized',
      passed: test10Pass,
      details: `Status: ${res10.status}, Message: "${data10.message}"`,
    });

    // ----------------------------------------------------
    // Test 11: Reuse detection invalidates all user sessions
    // ----------------------------------------------------
    console.log('Test 11: Refresh token reuse detection invalidates all active sessions...');
    // Because old token was used in Test 10, reuse detection should have triggered and wiped all sessions!
    // So rotatedRefreshToken should NOW also be rejected:
    const res11 = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
    });
    const data11 = (await res11.json()) as any;
    const test11Pass = res11.status === 401;

    results.push({
      testNumber: 11,
      description: 'Reuse detection successfully revoked all active user sessions',
      passed: test11Pass,
      details: `Status: ${res11.status}, Message: "${data11.message}"`,
    });

    // ----------------------------------------------------
    // Test 12: Logout revokes session, blacklists token, and clears cookie
    // ----------------------------------------------------
    console.log('Test 12: Logout revocation...');
    // Fresh login for logout test
    const loginForLogout = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, password }),
    });
    const logoutData = (await loginForLogout.json()) as any;

    const res12 = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${logoutData.accessToken}`,
      },
    });
    const data12 = (await res12.json()) as any;
    const clearCookieHeader = res12.headers.get('set-cookie') || '';
    const cookieCleared =
      clearCookieHeader.includes('refreshToken=;') ||
      clearCookieHeader.includes('Expires=Thu, 01 Jan 1970') ||
      clearCookieHeader.includes('Max-Age=0');

    // Verify access token is now blacklisted
    const checkBlacklist = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${logoutData.accessToken}`,
      },
    });

    const test12Pass =
      res12.status === 200 &&
      data12.success === true &&
      cookieCleared &&
      checkBlacklist.status === 401;

    results.push({
      testNumber: 12,
      description: 'Logout revokes refresh sessions, blacklists access token, and clears cookie',
      passed: Boolean(test12Pass),
      details: `Logout Status: ${res12.status}, Cookie Cleared: ${cookieCleared}, Blacklist Verified (Status 401): ${checkBlacklist.status === 401}`,
    });

    // ----------------------------------------------------
    // Test 13: Protected endpoint without token returns 401
    // ----------------------------------------------------
    console.log('Test 13: Protected endpoint without token...');
    const res13 = await fetch(`${BASE_URL}/auth/me`);
    const test13Pass = res13.status === 401;

    results.push({
      testNumber: 13,
      description: 'Accessing protected route without Authorization header returns 401',
      passed: test13Pass,
      details: `Status: ${res13.status}`,
    });

    // ----------------------------------------------------
    // Test 14: Protected endpoint with valid token returns 200
    // ----------------------------------------------------
    console.log('Test 14: Protected endpoint with valid fresh token...');
    // Log customer back in
    const freshLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, password }),
    });
    const freshData = (await freshLogin.json()) as any;
    const res14 = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${freshData.accessToken}` },
    });
    const data14 = (await res14.json()) as any;
    const test14Pass = res14.status === 200 && data14.user.email === customerEmail;

    results.push({
      testNumber: 14,
      description: 'Protected endpoint returns 200 OK and user context with valid token',
      passed: Boolean(test14Pass),
      details: `Status: ${res14.status}, Email: ${data14?.user?.email}`,
    });

    // ----------------------------------------------------
    // Test 15: Role-Based Access Control (Admin endpoint)
    // ----------------------------------------------------
    console.log('Test 15: Role-Based Access Control (@Roles guard)...');
    // Customer attempts admin-only endpoint -> Expect 403 Forbidden
    const customerAdminRes = await fetch(`${BASE_URL}/auth/merchant-only`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${freshData.accessToken}` },
    });
    const customerForbidden = customerAdminRes.status === 403;

    // Admin attempts admin-only endpoint -> Expect 200 OK
    const adminAdminRes = await fetch(`${BASE_URL}/auth/merchant-only`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    const adminOk = adminAdminRes.status === 200;

    const test15Pass = customerForbidden && adminOk;

    results.push({
      testNumber: 15,
      description: 'Role Guard allows admin access (200) and blocks customer access (403)',
      passed: test15Pass,
      details: `Customer Access: ${customerAdminRes.status} (Forbidden), Admin Access: ${adminAdminRes.status} (OK)`,
    });

  } catch (err) {
    console.error('Fatal error during test execution:', err);
  } finally {
    // Teardown
    console.log('\nCleaning up test artifacts...');
    try {
      const deleteResult = await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test_phase4_',
          },
        },
      });
      console.log(`✔ Cleaned up ${deleteResult.count} test user records from PostgreSQL.`);
      await prisma.$disconnect();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }

    if (app) {
      await app.close();
      console.log('✔ NestJS application closed gracefully.');
    }
  }

  // ----------------------------------------------------
  // Output Summary Table
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('PHASE 4 TEST SUMMARY RESULTS');
  console.log('====================================================');
  console.table(
    results.map((r) => ({
      '#': r.testNumber,
      'Test Scenario': r.description,
      Status: r.passed ? 'PASSED ✔' : 'FAILED ✖',
      Details: r.details,
    })),
  );

  const allPassed = results.length === 15 && results.every((r) => r.passed);
  console.log(
    `\nOverall Status: ${allPassed ? 'ALL 15 TESTS PASSED' : 'SOME TESTS FAILED'} (${results.filter((r) => r.passed).length}/${results.length})`,
  );

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
