process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://shopkart_admin:shopkartdb123@localhost:5433/shopkart";
process.env.NODE_ENV = 'development';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';
process.env.JWT_ISSUER = 'shopkart-auth-service';
process.env.JWT_AUDIENCE = 'shopkart-client';
process.env.CATALOG_API_URL = 'http://localhost:3020';

const jwt = require('jsonwebtoken');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('ts-node/register');

async function runVerification() {
  console.log('================ Starting Phase 2 Manual API Verification ================');

  const prisma = new PrismaClient();
  await prisma.$connect();

  // Find a real seeded product
  const product = await prisma.product.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, price: true },
  });

  if (!product) {
    console.error('ERROR: No active seeded product found in database!');
    process.exit(1);
  }

  console.log(`Using real seeded product: "${product.name}" (${product.id}) - Price: $${product.price}`);

  // Start Catalog Service on port 3020
  console.log('Bootstrapping Catalog Service on port 3020...');
  const catalogModulePath = fs.existsSync(path.resolve(__dirname, '../apps/catalog-service/dist/app.module.js'))
    ? '../apps/catalog-service/dist/app.module'
    : '../apps/catalog-service/src/app.module';
  const { AppModule: CatalogAppModule } = require(catalogModulePath);
  const catalogApp = await NestFactory.create(CatalogAppModule, { logger: ['error', 'warn'] });
  catalogApp.setGlobalPrefix('api/v1');
  await catalogApp.listen(3020);
  console.log('Catalog Service is live on port 3020.');

  // Start Cart Service on port 3030
  console.log('Bootstrapping Cart Service on port 3030...');
  const { AppModule: CartAppModule } = require('../apps/cart-service/dist/app.module');
  const cartApp = await NestFactory.create(CartAppModule, { logger: ['error', 'warn'] });
  cartApp.setGlobalPrefix('api/v1');
  cartApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await cartApp.listen(3030);
  console.log('Cart Service is live on port 3030.');

  // Create real test tokens
  const userAId = 'a1111111-1111-4111-8111-111111111111';
  const userBId = 'b2222222-2222-4222-8222-222222222222';

  const tokenA = jwt.sign(
    { sub: userAId, email: 'userA@example.com', role: 'customer' },
    process.env.JWT_ACCESS_SECRET,
    { issuer: 'shopkart-auth-service', audience: 'shopkart-client', expiresIn: '15m' },
  );

  const tokenB = jwt.sign(
    { sub: userBId, email: 'userB@example.com', role: 'customer' },
    process.env.JWT_ACCESS_SECRET,
    { issuer: 'shopkart-auth-service', audience: 'shopkart-client', expiresIn: '15m' },
  );

  let createdItemId = null;

  try {
    // 1. GET cart without token returns 401
    console.log('\n--- Step 1: GET /api/v1/cart without token ---');
    const res1 = await fetch('http://localhost:3030/api/v1/cart');
    const json1 = await res1.json();
    console.log(`Status: ${res1.status} (Expected: 401)`);
    console.log('Response:', JSON.stringify(json1));
    if (res1.status !== 401) throw new Error('Step 1 failed: Expected 401');

    // 2. GET cart with token returns empty cart
    console.log('\n--- Step 2: GET /api/v1/cart with valid token for User A ---');
    // Ensure clean initial state
    await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const res2 = await fetch('http://localhost:3030/api/v1/cart', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const json2 = await res2.json();
    console.log(`Status: ${res2.status} (Expected: 200)`);
    console.log('Response:', JSON.stringify(json2));
    if (res2.status !== 200 || json2.items.length !== 0) throw new Error('Step 2 failed: Expected empty cart');

    // 3. POST add product creates cart item
    console.log(`\n--- Step 3: POST /api/v1/cart/items adding product ${product.id} (qty: 2) ---`);
    const res3 = await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        productId: product.id,
        quantity: 2,
      }),
    });
    const json3 = await res3.json();
    console.log(`Status: ${res3.status} (Expected: 200)`);
    console.log('Response:', JSON.stringify(json3));
    if (res3.status !== 200 || json3.items.length !== 1) throw new Error('Step 3 failed: Expected 1 item');
    createdItemId = json3.items[0].id;
    console.log(`Created CartItem ID: ${createdItemId}`);

    // 4. GET cart returns persisted item
    console.log('\n--- Step 4: GET /api/v1/cart returns persisted item ---');
    const res4 = await fetch('http://localhost:3030/api/v1/cart', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const json4 = await res4.json();
    console.log(`Status: ${res4.status} (Expected: 200)`);
    console.log('Response:', JSON.stringify(json4));
    if (res4.status !== 200 || json4.summary.totalItems !== 2) throw new Error('Step 4 failed: Expected totalItems: 2');

    // 5. PATCH quantity updates item
    console.log(`\n--- Step 5: PATCH /api/v1/cart/items/${createdItemId} with quantity: 5 ---`);
    const res5 = await fetch(`http://localhost:3030/api/v1/cart/items/${createdItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ quantity: 5 }),
    });
    const json5 = await res5.json();
    console.log(`Status: ${res5.status} (Expected: 200)`);
    console.log('Response:', JSON.stringify(json5));
    if (res5.status !== 200 || json5.items[0].quantity !== 5) throw new Error('Step 5 failed: Expected quantity 5');

    // 6. DELETE removes item
    console.log(`\n--- Step 6: DELETE /api/v1/cart/items/${createdItemId} removes item ---`);
    const res6 = await fetch(`http://localhost:3030/api/v1/cart/items/${createdItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const json6 = await res6.json();
    console.log(`Status: ${res6.status} (Expected: 200)`);
    console.log('Response:', JSON.stringify(json6));
    if (res6.status !== 200 || json6.items.length !== 0) throw new Error('Step 6 failed: Expected 0 items');

    // Re-add an item for clear test
    await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });

    // 7. DELETE clear empties cart
    console.log('\n--- Step 7: DELETE /api/v1/cart/items empties cart ---');
    const res7 = await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const json7 = await res7.json();
    console.log(`Status: ${res7.status} (Expected: 200)`);
    console.log('Response:', JSON.stringify(json7));
    if (res7.status !== 200 || json7.items.length !== 0) throw new Error('Step 7 failed: Expected empty cart');

    // 8. Invalid product is rejected
    console.log('\n--- Step 8: POST /api/v1/cart/items with nonexistent product ---');
    const res8 = await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        productId: '99999999-9999-4999-8999-999999999999',
        quantity: 1,
      }),
    });
    const json8 = await res8.json();
    console.log(`Status: ${res8.status} (Expected: 404)`);
    console.log('Response:', JSON.stringify(json8));
    if (res8.status !== 404) throw new Error('Step 8 failed: Expected 404');

    // 9. Another user's cart item cannot be accessed
    console.log('\n--- Step 9: User B attempting to mutate User A item ---');
    // Add item as User A first
    const reAddRes = await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    const reAddJson = await reAddRes.json();
    const userAItemId = reAddJson.items[0].id;

    // User B attempts to delete User A's item
    const res9 = await fetch(`http://localhost:3030/api/v1/cart/items/${userAItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const json9 = await res9.json();
    console.log(`Status: ${res9.status} (Expected: 404)`);
    console.log('Response:', JSON.stringify(json9));
    if (res9.status !== 404) throw new Error('Step 9 failed: Expected 404 Not Found for cross-user item access');

    // Cleanup: clear User A cart
    await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    console.log('\n================ ALL 9 MANUAL API VERIFICATION CHECKS PASSED! ================');
  } finally {
    await cartApp.close();
    await catalogApp.close();
    await prisma.$disconnect();
    console.log('Services and DB connection shut down gracefully.');
  }
}

runVerification().catch((err) => {
  console.error('Manual verification failed:', err);
  process.exit(1);
});
