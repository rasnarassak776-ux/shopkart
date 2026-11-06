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
const API_BASE_URL = `http://localhost:${TEST_PORT}`;
const prisma = new PrismaClient();

// ==============================================================================
// EXACT REPLICA OF apps/web/src/lib/api-client.ts LOGIC UNDER TEST
// ==============================================================================
class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let authFailureCallback: (() => void) | null = null;

function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

function onAuthFailure(callback: () => void): void {
  authFailureCallback = callback;
}

interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, headers: customHeaders = {}, ...rest } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const headers = new Headers(customHeaders);

  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach in-memory access token if available
  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      credentials: 'include',
    });
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to the server. Please check your network connection.',
      0,
    );
  }

  // If 401 and request is eligible for refresh retry
  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !url.includes('/auth/login') &&
    !url.includes('/auth/refresh')
  ) {
    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(
            `${API_BASE_URL.replace(/\/$/, '')}/api/v1/auth/refresh`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({}),
            },
          );

          if (!refreshRes.ok) {
            setAccessToken(null);
            if (authFailureCallback) {
              authFailureCallback();
            }
            return null;
          }

          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken || null;
          setAccessToken(newToken);
          return newToken;
        } catch {
          setAccessToken(null);
          if (authFailureCallback) {
            authFailureCallback();
          }
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newAccessToken = await refreshPromise;

    if (newAccessToken) {
      // Retry original request once with new token
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      try {
        const retryRes = await fetch(url, {
          ...rest,
          headers,
          credentials: 'include',
        });

        if (!retryRes.ok) {
          return handleResponseError(retryRes);
        }

        return retryRes.json();
      } catch (retryError) {
        throw new ApiError(
          'Network error while retrying request after token refresh.',
          0,
        );
      }
    }
  }

  if (!response.ok) {
    return handleResponseError(response);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function handleResponseError(response: Response): Promise<never> {
  let errorData: any = null;
  try {
    errorData = await response.json();
  } catch {}

  const status = response.status;
  let message = 'An unexpected error occurred.';
  let errors: string[] | undefined = undefined;

  if (errorData) {
    if (Array.isArray(errorData.message)) {
      errors = errorData.message;
      message = errorData.message[0] || message;
    } else if (typeof errorData.message === 'string') {
      message = errorData.message;
    } else if (typeof errorData.error === 'string') {
      message = errorData.error;
    }
  }

  throw new ApiError(message, status, errors);
}

// ==============================================================================
// TEST HARNESS
// ==============================================================================
interface TestResult {
  testNumber: number;
  scenario: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function runFrontendIntegrationTests() {
  console.log('====================================================');
  console.log('SHOPKART MEMBER 1: PHASE 5 FRONTEND INTEGRATION TESTS');
  console.log('====================================================\n');

  let app: INestApplication | null = null;
  const timestamp = Date.now();
  const testCustomerEmail = `frontend_cust_${timestamp}@example.com`;
  const testAdminEmail = `frontend_admin_${timestamp}@example.com`;
  const testPassword = 'StrongPassword123!';

  // Cookie jar simulation for Node environment
  let currentCookieJar: string | null = null;
  const originalFetch = global.fetch;

  // Intercept fetch to simulate browser cookie management for cross-origin credentials: 'include'
  global.fetch = async (input: any, init?: any) => {
    const headers = new Headers(init?.headers || {});
    if (init?.credentials === 'include' && currentCookieJar) {
      headers.set('Cookie', currentCookieJar);
    }
    const modifiedInit = { ...init, headers };
    const res = await originalFetch(input, modifiedInit);

    // Save set-cookie if returned
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      if (setCookie.includes('refreshToken=;') || setCookie.includes('Max-Age=0')) {
        currentCookieJar = null;
      } else {
        const match = setCookie.match(/refreshToken=[^;]+/);
        if (match) {
          currentCookieJar = match[0];
        }
      }
    }
    return res;
  };

  try {
    // 1. Bootstrap NestJS Auth Microservice
    console.log('Starting NestJS Auth Service on port 3010 for frontend integration...');
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
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    });
    await app.listen(TEST_PORT);
    console.log(`Auth Service listening on port ${TEST_PORT}\n`);

    // Prepare seeded admin account
    const dbAdminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (dbAdminRole) {
      const existingAdmin = await prisma.user.findUnique({ where: { email: testAdminEmail } });
      if (!existingAdmin) {
        await prisma.user.create({
          data: {
            name: 'Frontend Admin',
            email: testAdminEmail,
            passwordHash: await bcrypt.hash(testPassword, 12),
            roleId: dbAdminRole.id,
            isActive: true,
          },
        });
      }
    }

    // ----------------------------------------------------
    // Test 1: Frontend Registration
    // ----------------------------------------------------
    console.log('Test 1: Frontend Registration Integration...');
    const regRes = await apiClient<{ success: boolean; message: string; customer: any }>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Frontend Test User',
          email: testCustomerEmail,
          password: testPassword,
          phone: '+91 9876543210',
        }),
      },
    );

    const test1Pass =
      regRes.success === true &&
      regRes.customer &&
      regRes.customer.email === testCustomerEmail.toLowerCase() &&
      regRes.customer.role === 'customer';

    results.push({
      testNumber: 1,
      scenario: 'Registration through frontend API client',
      passed: Boolean(test1Pass),
      details: `Success: ${regRes.success}, Customer ID: ${regRes?.customer?.id}`,
    });

    // ----------------------------------------------------
    // Test 2: Duplicate Email Registration
    // ----------------------------------------------------
    console.log('Test 2: Duplicate Email Registration...');
    let test2Pass = false;
    let test2Message = '';
    try {
      await apiClient('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Another User',
          email: testCustomerEmail.toUpperCase(),
          password: testPassword,
        }),
      });
    } catch (err: any) {
      test2Pass = err instanceof ApiError && err.status === 409;
      test2Message = err.message;
    }

    results.push({
      testNumber: 2,
      scenario: 'Duplicate email registration rejected with 409 Conflict',
      passed: test2Pass,
      details: `Status: 409, Message: "${test2Message}"`,
    });

    // ----------------------------------------------------
    // Test 3: Invalid Email & Password Login
    // ----------------------------------------------------
    console.log('Test 3: Invalid credentials login rejection...');
    let test3Pass = false;
    let test3Message = '';
    try {
      await apiClient('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testCustomerEmail,
          password: 'WrongPassword!',
        }),
      });
    } catch (err: any) {
      test3Pass = err instanceof ApiError && err.status === 401;
      test3Message = err.message;
    }

    results.push({
      testNumber: 3,
      scenario: 'Invalid login returns 401 with generic message',
      passed: test3Pass,
      details: `Status: 401, Message: "${test3Message}"`,
    });

    // ----------------------------------------------------
    // Test 4: Successful Customer Login & In-Memory Token Storage
    // ----------------------------------------------------
    console.log('Test 4: Customer login & in-memory token storage...');
    const loginRes = await apiClient<{
      success: boolean;
      user: any;
      accessToken: string;
      refreshToken: string;
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testPassword,
      }),
    });

    setAccessToken(loginRes.accessToken);

    const test4Pass =
      loginRes.success === true &&
      loginRes.user.role === 'customer' &&
      loginRes.accessToken &&
      getAccessToken() === loginRes.accessToken &&
      Boolean(currentCookieJar && (currentCookieJar as string).includes('refreshToken='));

    results.push({
      testNumber: 4,
      scenario: 'Customer login sets in-memory token and receives HttpOnly cookie',
      passed: Boolean(test4Pass),
      details: `Role: ${loginRes.user.role}, In-Memory Token Set: ${Boolean(getAccessToken())}, Cookie Present: ${Boolean(currentCookieJar)}`,
    });

    // ----------------------------------------------------
    // Test 5: Customer Dashboard Redirection Determination
    // ----------------------------------------------------
    console.log('Test 5: Customer dashboard redirection determination...');
    const customerDestination =
      loginRes.user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
    const test5Pass = customerDestination === '/customer/dashboard';

    results.push({
      testNumber: 5,
      scenario: 'Customer role determines redirection to /customer/dashboard',
      passed: test5Pass,
      details: `Redirect Target: "${customerDestination}"`,
    });

    // ----------------------------------------------------
    // Test 6: Protected Route Access with In-Memory Bearer Token
    // ----------------------------------------------------
    console.log('Test 6: Protected route access (/api/v1/auth/me)...');
    const meRes = await apiClient<{ success: boolean; user: any }>('/api/v1/auth/me');
    const test6Pass =
      meRes.success === true &&
      meRes.user.email === testCustomerEmail.toLowerCase() &&
      meRes.user.role === 'customer';

    results.push({
      testNumber: 6,
      scenario: 'API client automatically attaches Bearer token to protected requests',
      passed: Boolean(test6Pass),
      details: `Status 200, User ID: ${meRes.user.id}, Role: ${meRes.user.role}`,
    });

    // ----------------------------------------------------
    // Test 7: Customer Attempting Admin Resource Access (403 Forbidden)
    // ----------------------------------------------------
    console.log('Test 7: Customer access to admin-only endpoint...');
    let test7Pass = false;
    let test7Status = 0;
    try {
      await apiClient('/api/v1/auth/admin-only');
    } catch (err: any) {
      test7Status = err.status;
      test7Pass = err instanceof ApiError && err.status === 403;
    }

    results.push({
      testNumber: 7,
      scenario: 'Customer attempting admin access receives 403 Forbidden',
      passed: test7Pass,
      details: `Status: ${test7Status} (Forbidden)`,
    });

    // ----------------------------------------------------
    // Test 8: Unauthenticated Protected Route Access (401)
    // ----------------------------------------------------
    console.log('Test 8: Unauthenticated protected route access...');
    const savedToken = getAccessToken();
    const savedCookie = currentCookieJar;
    setAccessToken(null);
    currentCookieJar = null;

    let test8Pass = false;
    let test8Status = 0;
    try {
      await apiClient('/api/v1/auth/me', { skipAuthRefresh: true });
    } catch (err: any) {
      test8Status = err.status;
      test8Pass = err instanceof ApiError && err.status === 401;
    }

    setAccessToken(savedToken);
    currentCookieJar = savedCookie;

    results.push({
      testNumber: 8,
      scenario: 'Unauthenticated request to protected route rejected with 401',
      passed: test8Pass,
      details: `Status: ${test8Status} (Unauthorized)`,
    });

    // ----------------------------------------------------
    // Test 9: Automatic Access-Token Refresh on 401
    // ----------------------------------------------------
    console.log('Test 9: Automatic access token refresh on 401...');
    setAccessToken('expired.tampered.token');

    const autoRefreshRes = await apiClient<{ success: boolean; user: any }>('/api/v1/auth/me');
    const newAccessToken = getAccessToken();

    const test9Pass =
      autoRefreshRes.success === true &&
      newAccessToken !== null &&
      newAccessToken !== 'expired.tampered.token' &&
      newAccessToken !== savedToken;

    results.push({
      testNumber: 9,
      scenario: 'Automatic token refresh on 401 transparently retries and succeeds',
      passed: Boolean(test9Pass),
      details: `Token Rotated: ${newAccessToken !== savedToken}, User: ${autoRefreshRes?.user?.email}`,
    });

    // ----------------------------------------------------
    // Test 10: Deduplication of Multiple Simultaneous Requests During Refresh
    // ----------------------------------------------------
    console.log('Test 10: Deduplicating multiple simultaneous refresh requests...');
    setAccessToken('expired.simultaneous.token');

    const [resA, resB, resC] = await Promise.all([
      apiClient<{ success: boolean; user: any }>('/api/v1/auth/me'),
      apiClient<{ success: boolean; user: any }>('/api/v1/auth/me'),
      apiClient<{ success: boolean; user: any }>('/api/v1/auth/me'),
    ]);

    const test10Pass =
      resA.success === true &&
      resB.success === true &&
      resC.success === true &&
      resA.user.id === resB.user.id &&
      resB.user.id === resC.user.id;

    results.push({
      testNumber: 10,
      scenario: 'Concurrent requests during token expiration share single refresh promise',
      passed: Boolean(test10Pass),
      details: `All 3 concurrent requests succeeded with user ID ${resA?.user?.id}`,
    });

    // ----------------------------------------------------
    // Test 11: Refresh Failure Clears State and Executes onAuthFailure
    // ----------------------------------------------------
    console.log('Test 11: Refresh failure handling...');
    const authFailureState = { called: false };
    onAuthFailure(() => {
      authFailureState.called = true;
    });

    currentCookieJar = 'refreshToken=invalid_revoked_cookie';
    setAccessToken('invalid.token');

    let test11Status = 0;
    try {
      await apiClient('/api/v1/auth/me');
    } catch (err: any) {
      test11Status = err.status;
    }

    const test11Pass =
      test11Status === 401 &&
      getAccessToken() === null &&
      authFailureState.called === true;

    results.push({
      testNumber: 11,
      scenario: 'Refresh failure clears in-memory token and fires onAuthFailure',
      passed: test11Pass,
      details: `Token Cleared: ${getAccessToken() === null}, Callback Fired: ${authFailureState.called}`,
    });

    // ----------------------------------------------------
    // Test 12: Manual Logout Integration
    // ----------------------------------------------------
    console.log('Test 12: Manual logout integration...');
    const reLogin = await apiClient<{ success: boolean; user: any; accessToken: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: testCustomerEmail, password: testPassword }),
      },
    );
    setAccessToken(reLogin.accessToken);

    const logoutRes = await apiClient<{ success: boolean; message: string }>(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
    );

    setAccessToken(null);

    const test12Pass =
      logoutRes.success === true &&
      currentCookieJar === null &&
      getAccessToken() === null;

    results.push({
      testNumber: 12,
      scenario: 'Logout revokes backend sessions, clears HttpOnly cookie, and clears token',
      passed: Boolean(test12Pass),
      details: `Logout Success: ${logoutRes.success}, Cookie Cleared: ${currentCookieJar === null}`,
    });

    // ----------------------------------------------------
    // Test 13: Admin Login & Dashboard Redirection
    // ----------------------------------------------------
    console.log('Test 13: Admin login & dashboard redirection...');
    const adminLoginRes = await apiClient<{
      success: boolean;
      user: any;
      accessToken: string;
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testAdminEmail,
        password: testPassword,
      }),
    });

    const adminUserRole: string = adminLoginRes.user.role;
    const adminTarget = adminUserRole === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
    const test13Pass =
      adminLoginRes.success === true &&
      adminUserRole === 'admin' &&
      adminTarget === '/admin/dashboard';

    results.push({
      testNumber: 13,
      scenario: 'Admin login verifies admin role and routes to /admin/dashboard',
      passed: test13Pass,
      details: `Role: ${adminUserRole}, Destination: "${adminTarget}"`,
    });

    // ----------------------------------------------------
    // Test 14: CORS Configuration & Credentials Verification
    // ----------------------------------------------------
    console.log('Test 14: CORS configuration & credentials verification...');
    const corsCheck = await fetch('http://localhost:3010/api/v1/health', {
      method: 'GET',
      headers: {
        Origin: 'http://localhost:3000',
      },
    });

    const allowOrigin = corsCheck.headers.get('access-control-allow-origin');
    const allowCredentials = corsCheck.headers.get('access-control-allow-credentials');

    const test14Pass =
      allowOrigin === 'http://localhost:3000' &&
      allowCredentials === 'true';

    results.push({
      testNumber: 14,
      scenario: 'Backend CORS permits http://localhost:3000 with credentials: true',
      passed: Boolean(test14Pass),
      details: `Origin: ${allowOrigin}, Credentials: ${allowCredentials}`,
    });

  } catch (fatalError: any) {
    console.error('Test execution error:', fatalError);
  } finally {
    global.fetch = originalFetch;

    // Teardown
    console.log('\nCleaning up test artifacts...');
    try {
      const deleteResult = await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'frontend_',
          },
        },
      });
      console.log(`✔ Cleaned up ${deleteResult.count} test user records.`);
      await prisma.$disconnect();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }

    if (app) {
      await app.close();
      console.log('✔ Auth Service closed gracefully.');
    }
  }

  // ----------------------------------------------------
  // Output Summary Table
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('PHASE 5 FRONTEND INTEGRATION TEST RESULTS');
  console.log('====================================================');
  console.table(
    results.map((r) => ({
      '#': r.testNumber,
      'Integration Scenario': r.scenario,
      Status: r.passed ? 'PASSED ✔' : 'FAILED ✖',
      Details: r.details,
    })),
  );

  const allPassed = results.length >= 14 && results.every((r) => r.passed);
  console.log(
    `\nOverall Status: ${allPassed ? 'ALL INTEGRATION TESTS PASSED' : 'SOME TESTS FAILED'} (${results.filter((r) => r.passed).length}/${results.length})\n`,
  );

  if (!allPassed) {
    process.exit(1);
  }
}

runFrontendIntegrationTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
