import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function runTests() {
  console.log('====================================================');
  console.log('SHOPKART MEMBER 1: PHASE 3 REGISTRATION TEST SUITE');
  console.log('====================================================\n');

  let app: INestApplication | null = null;
  const testEmail = `test_customer_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let createdCustomerId: string | null = null;

  try {
    console.log('Bootstrapping Auth Service on port 3010 for tests...');
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
    // ----------------------------------------------------
    // Test 1: Successful customer registration
    // ----------------------------------------------------
    console.log('Running Test 1: Successful customer registration...');
    const res1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: testEmail,
        password: testPassword,
        phone: '+91 9876543210',
      }),
    });

    const data1 = (await res1.json()) as any;
    const test1Pass =
      res1.status === 201 &&
      data1.success === true &&
      data1.customer &&
      data1.customer.id &&
      data1.customer.email === testEmail.toLowerCase();

    if (test1Pass) {
      createdCustomerId = data1.customer.id;
    }

    results.push({
      testNumber: 1,
      description: 'Successful customer registration returns 201 and customer profile',
      passed: test1Pass,
      details: `Status: ${res1.status}, ID: ${data1?.customer?.id}`,
    });

    // ----------------------------------------------------
    // Test 2: Duplicate email registration
    // ----------------------------------------------------
    console.log('Running Test 2: Duplicate email registration...');
    const res2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another Jane',
        email: testEmail.toUpperCase(), // Test case-insensitive normalization
        password: 'AnotherPassword123!',
      }),
    });
    const data2 = (await res2.json()) as any;
    const test2Pass = res2.status === 409;

    results.push({
      testNumber: 2,
      description: 'Duplicate email registration rejected with 409 Conflict',
      passed: test2Pass,
      details: `Status: ${res2.status}, Message: "${data2.message}"`,
    });

    // ----------------------------------------------------
    // Test 3: Invalid email
    // ----------------------------------------------------
    console.log('Running Test 3: Invalid email...');
    const res3 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'invalid-email-format',
        password: testPassword,
      }),
    });
    const test3Pass = res3.status === 400;

    results.push({
      testNumber: 3,
      description: 'Invalid email rejected with 400 Bad Request',
      passed: test3Pass,
      details: `Status: ${res3.status}`,
    });

    // ----------------------------------------------------
    // Test 4: Missing name
    // ----------------------------------------------------
    console.log('Running Test 4: Missing name...');
    const res4 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: `test_${Date.now()}@example.com`,
        password: testPassword,
      }),
    });
    const test4Pass = res4.status === 400;

    results.push({
      testNumber: 4,
      description: 'Missing/empty name rejected with 400 Bad Request',
      passed: test4Pass,
      details: `Status: ${res4.status}`,
    });

    // ----------------------------------------------------
    // Test 5: Weak password
    // ----------------------------------------------------
    console.log('Running Test 5: Weak password...');
    const res5 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: `test_weak_${Date.now()}@example.com`,
        password: 'weak', // Less than 8 chars, no uppercase/number
      }),
    });
    const test5Pass = res5.status === 400;

    results.push({
      testNumber: 5,
      description: 'Weak password policy enforcement rejected with 400 Bad Request',
      passed: test5Pass,
      details: `Status: ${res5.status}`,
    });

    // ----------------------------------------------------
    // Test 6: Missing required fields
    // ----------------------------------------------------
    console.log('Running Test 6: Missing required fields...');
    const res6 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const test6Pass = res6.status === 400;

    results.push({
      testNumber: 6,
      description: 'Missing required payload rejected with 400 Bad Request',
      passed: test6Pass,
      details: `Status: ${res6.status}`,
    });

    // ----------------------------------------------------
    // Test 7: Attempt to submit role or roleId as admin
    // ----------------------------------------------------
    console.log('Running Test 7: Attempt to submit role or roleId as admin...');
    const res7 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: `hacker_${Date.now()}@example.com`,
        password: testPassword,
        role: 'merchant',
        roleId: '9031a6bb-8ba8-47de-a805-ebfdd0e72d71',
      }),
    });
    const test7Pass = res7.status === 400;

    results.push({
      testNumber: 7,
      description: 'Attempt to inject role/roleId rejected with 400 Bad Request',
      passed: test7Pass,
      details: `Status: ${res7.status} (Non-whitelisted properties forbidden)`,
    });

    // ----------------------------------------------------
    // Test 8: Verify password is hashed in PostgreSQL
    // ----------------------------------------------------
    console.log('Running Test 8: Verify password is hashed in PostgreSQL...');
    let test8Pass = false;
    let hashPrefix = '';
    let hashComparison = false;

    if (createdCustomerId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: createdCustomerId },
      });

      if (dbUser && dbUser.passwordHash) {
        hashPrefix = dbUser.passwordHash.substring(0, 7); // e.g., $2a$12$ or $2b$12$
        const isBcryptCost12 =
          hashPrefix === '$2a$12$' || hashPrefix === '$2b$12$';
        const isNotPlainText = dbUser.passwordHash !== testPassword;
        hashComparison = await bcrypt.compare(testPassword, dbUser.passwordHash);

        test8Pass = isBcryptCost12 && isNotPlainText && hashComparison;
      }
    }

    results.push({
      testNumber: 8,
      description: 'Password in PostgreSQL is securely hashed with bcrypt cost factor 12',
      passed: test8Pass,
      details: `Hash algorithm prefix: "${hashPrefix}", Bcrypt comparison verified: ${hashComparison}`,
    });

    // ----------------------------------------------------
    // Test 9: Verify passwordHash is not returned in API response
    // ----------------------------------------------------
    console.log('Running Test 9: Verify passwordHash is not returned in API response...');
    const hasNoPasswordHash =
      data1 &&
      data1.customer &&
      data1.customer.passwordHash === undefined &&
      data1.passwordHash === undefined &&
      !JSON.stringify(data1).includes('password_hash') &&
      !JSON.stringify(data1).includes(testPassword);

    results.push({
      testNumber: 9,
      description: 'API response strictly omits passwordHash and plain passwords',
      passed: hasNoPasswordHash,
      details: `passwordHash in payload: ${!hasNoPasswordHash ? 'LEAKED' : 'EXCLUDED'}`,
    });

    // ----------------------------------------------------
    // Test 10: Verify new user is assigned customer role
    // ----------------------------------------------------
    console.log('Running Test 10: Verify new user is assigned customer role...');
    let test10Pass = false;
    let actualRoleName = '';

    if (createdCustomerId) {
      const dbUserWithRole = await prisma.user.findUnique({
        where: { id: createdCustomerId },
        include: { role: true },
      });

      actualRoleName = dbUserWithRole?.role?.name || '';
      test10Pass =
        data1?.customer?.role === 'customer' && actualRoleName === 'customer';
    }

    results.push({
      testNumber: 10,
      description: 'New user is assigned existing "customer" role in database',
      passed: test10Pass,
      details: `API role: "${data1?.customer?.role}", DB role: "${actualRoleName}"`,
    });
  } finally {
    // ----------------------------------------------------
    // Clean up test records
    // ----------------------------------------------------
    console.log('\nCleaning up test records from PostgreSQL...');
    try {
      const deleteResult = await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test_',
          },
        },
      });
      console.log(`✔ Cleaned up ${deleteResult.count} test customer records.`);
      if (app) {
        await app.close();
      }
      await prisma.$disconnect();
    } catch (err) {
      console.warn('Cleanup warning:', err);
    }
  }

  // ----------------------------------------------------
  // Output Results Table
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('TEST SUMMARY RESULTS');
  console.log('====================================================');
  console.table(
    results.map((r) => ({
      '#': r.testNumber,
      'Test Case': r.description,
      Status: r.passed ? 'PASSED ✔' : 'FAILED ✖',
      Details: r.details,
    })),
  );

  const allPassed = results.every((r) => r.passed);
  console.log(
    `\nOverall Status: ${allPassed ? 'ALL 10 TESTS PASSED' : 'SOME TESTS FAILED'} (${results.filter((r) => r.passed).length}/${results.length})`,
  );

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
