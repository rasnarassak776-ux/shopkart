import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
  console.log('====================================================');
  console.log('SHOPKART MEMBER 1: PHASE 2 INTEGRATION VERIFICATION');
  console.log('====================================================\n');

  // 1. Prisma & PostgreSQL Verification
  console.log('--- 1. Testing PostgreSQL Database Connectivity (Port 5433) ---');
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://shopkart_admin:replace_with_your_local_password@localhost:5433/shopkart';
  console.log(`Connecting to: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}`);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✔ Prisma connected to PostgreSQL successfully.');

    // Lightweight health query
    await prisma.$queryRaw`SELECT 1 as health_check`;
    console.log('✔ Lightweight query (SELECT 1) executed successfully.');

    // Task 5.1: Fetch seeded customer role
    const customerRole = await prisma.role.findUnique({
      where: { name: 'customer' },
    });
    console.log('✔ Seeded Customer Role found:', customerRole);

    // Task 5.2: Fetch seeded admin role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'merchant' },
    });
    console.log('✔ Seeded Admin Role found:', adminRole);

    // Task 5.3: Read-only query on users
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ take: 3 });
    console.log(`✔ Read-only query on auth.users: total=${userCount}, sample=`, users);

    // Task 5.4: Read-only query on addresses
    const addressCount = await prisma.address.count();
    const addresses = await prisma.address.findMany({ take: 3 });
    console.log(`✔ Read-only query on auth.addresses: total=${addressCount}, sample=`, addresses);

    await prisma.$disconnect();
  } catch (error) {
    console.error('✖ PostgreSQL Verification Failed:', error);
    process.exitCode = 1;
  }

  // 2. Redis Verification
  console.log('\n--- 2. Testing Redis Connectivity (Port 6379) ---');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`Connecting to Redis: ${redisUrl}`);

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
  });

  try {
    const pingResponse = await redis.ping();
    console.log(`✔ Redis ping response: ${pingResponse}`);
    console.log('✔ Redis connection established successfully.');
    await redis.quit();
  } catch (error) {
    console.error('✖ Redis Verification Failed:', (error as Error).message);
    process.exitCode = 1;
  }

  console.log('\n====================================================');
  console.log('INTEGRATION VERIFICATION FINISHED');
  console.log('====================================================');
}

verify();
