/**
 * Verification script for Shopkart Phase 2.5 Contract Check
 */
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://shopkart_admin:shopkartdb123@localhost:5433/shopkart',
    },
  },
});

async function runVerification() {
  console.log('=== SHOPKART PHASE 2.5 CONTRACT VERIFICATION ===\n');

  // 1. Verify PostgreSQL table and column names for Cart
  console.log('--- 1. DATABASE SCHEMA & TABLE MAPPING ---');
  const tableInfo = await prisma.$queryRaw`
    SELECT table_schema, table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'cart' AND table_name = 'carts'
    ORDER BY ordinal_position;
  `;
  console.log('Actual "cart"."carts" columns in PostgreSQL:');
  console.table(tableInfo);

  // Check unique constraints / indexes on cart.carts
  const indexes = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'cart' AND tablename = 'carts';
  `;
  console.log('\nExisting indexes on "cart"."carts":');
  console.table(indexes);

  // 2. Verify Auth Token generation format and validation
  console.log('\n--- 2. JWT CONFIGURATION & AUTH TOKEN VERIFICATION ---');
  const secret = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';
  const issuer = 'shopkart-auth-service';
  const audience = 'shopkart-client';

  console.log(`JWT Secret: ${secret.substring(0, 8)}...`);
  console.log(`JWT Issuer: ${issuer}`);
  console.log(`JWT Audience: ${audience}`);
  console.log(`JWT Algorithm: HS256`);

  const mockUser = {
    sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    email: 'contract-test@shopkart.com',
    role: 'CUSTOMER',
    jti: 'mock-jti-uuid',
  };

  const authToken = jwt.sign(mockUser, secret, {
    algorithm: 'HS256',
    issuer,
    audience,
    expiresIn: '15m',
  });
  console.log('\nSample Auth Service access token generated successfully.');

  // Verify token decoding
  const decoded = jwt.verify(authToken, secret, {
    algorithms: ['HS256'],
    issuer,
    audience,
  });
  console.log('Decoded claims:', JSON.stringify(decoded, null, 2));

  // 3. Check Catalog sample product in DB
  console.log('\n--- 3. CATALOG PRODUCT VERIFICATION ---');
  const sampleProduct = await prisma.product.findFirst({
    where: { isActive: true },
    include: {
      category: true,
      images: {
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      },
    },
  });

  if (sampleProduct) {
    console.log(`Found sample active product in DB: "${sampleProduct.name}" (ID: ${sampleProduct.id})`);
    console.log(`Price in DB (Decimal): ${sampleProduct.price}`);
    console.log(`Formatted Price (string per Catalog Service findById): "${sampleProduct.price.toString()}"`);
    console.log(`Images count: ${sampleProduct.images.length}`);
    if (sampleProduct.images[0]) {
      console.log(`Primary image URL: ${sampleProduct.images[0].imageUrl}`);
    }
  } else {
    console.log('No active products found in catalog table.');
  }

  await prisma.$disconnect();
  console.log('\n=== VERIFICATION FINISHED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
