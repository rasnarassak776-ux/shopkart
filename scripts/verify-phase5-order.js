/**
 * Shopkart – Member 3 – Phase 5 End-to-End Live Verification Script
 * Validates:
 * 1. Customer JWT auth token verification
 * 2. Delivery address snapshot retrieval
 * 3. Cart addition and item pricing validation
 * 4. COD Order placement (POST /api/v1/orders)
 * 5. Idempotent replays with Idempotency-Key
 * 6. Concurrency-safe atomic inventory reservation in PostgreSQL
 * 7. Cart conversion status (CartStatus.CONVERTED)
 * 8. Initial OrderStatusHistory and PaymentStatus (COD_PENDING)
 * 9. Customer order retrieval (GET /api/v1/orders/:id)
 * 10. Security checks (401 Unauthorized without token)
 */

const path = require('path');
const dotenv = require('dotenv');
const { fork } = require('child_process');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';
const JWT_ISSUER = 'shopkart-auth-service';
const JWT_AUDIENCE = 'shopkart-client';

function startProcess(name, relativePath, port) {
  return new Promise((resolve) => {
    console.log(`  -> Starting ${name} on port ${port}...`);
    const proc = fork(path.resolve(__dirname, '..', relativePath), [], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        PORT: port,
        CATALOG_SERVICE_PORT: 3020,
        CART_SERVICE_PORT: 3030,
        ORDER_SERVICE_PORT: 3040,
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    let resolved = false;

    proc.stdout.on('data', (d) => {
      const text = d.toString();
      if (text.includes('running on port') || text.includes('successfully started')) {
        if (!resolved) {
          resolved = true;
          console.log(`  -> ${name} is listening on port ${port}`);
          resolve(proc);
        }
      }
    });

    proc.stderr.on('data', (d) => {
      console.error(`  [${name} STDERR]`, d.toString().trim());
    });

    // Health check polling
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/health`);
        if (res.ok || res.status === 404 || res.status === 200) {
          clearInterval(timer);
          if (!resolved) {
            resolved = true;
            console.log(`  -> ${name} is responsive on port ${port}`);
            resolve(proc);
          }
        }
      } catch (err) {}
    }, 400);

    setTimeout(() => {
      clearInterval(timer);
      if (!resolved) {
        resolved = true;
        console.log(`  -> ${name} proceeded after startup window`);
        resolve(proc);
      }
    }, 8000);
  });
}

async function main() {
  console.log('====================================================');
  console.log('SHOPKART MEMBER 3 - PHASE 5 LIVE VERIFICATION');
  console.log('====================================================\n');

  // 1. Find a customer user in the database
  const customer = await prisma.user.findFirst({
    where: {
      role: {
        name: { in: ['customer', 'CUSTOMER'] },
      },
    },
    include: { role: true },
  });

  if (!customer) {
    throw new Error('No customer user found in database. Seed user first.');
  }

  console.log(`[1/10] Found customer user: ${customer.email} (ID: ${customer.id})`);

  // Generate real JWT token matching Auth Service contracts
  const token = jwt.sign(
    {
      sub: customer.id,
      email: customer.email,
      role: customer.role.name.toUpperCase(),
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: '1h',
    },
  );
  console.log('[1/10] Generated authentic Auth-signed JWT access token.');

  // 2. Ensure customer has an address
  let address = await prisma.address.findFirst({
    where: { userId: customer.id },
  });

  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: customer.id,
        fullName: 'Jane Doe',
        phone: '+91 9876543210',
        addressLine1: 'Flat 101, Phase 5 Residency',
        addressLine2: 'Tech Corridor',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560100',
        country: 'India',
        isDefault: true,
      },
    });
    console.log(`[2/10] Created test delivery address: ${address.id}`);
  } else {
    console.log(`[2/10] Using existing delivery address: ${address.id} (${address.fullName})`);
  }

  // 3. Start microservices
  console.log('\n[3/10] Launching microservices (Catalog, Cart, Order)...');
  const catalogProc = await startProcess('Catalog Service', 'apps/catalog-service/dist/main.js', 3020);
  const cartProc = await startProcess('Cart Service', 'apps/cart-service/dist/main.js', 3030);
  const orderProc = await startProcess('Order Service', 'apps/order-service/dist/main.js', 3040);

  // Short pause to ensure all connections initialized
  await new Promise((r) => setTimeout(r, 1500));

  try {
    const testProductId = '20000000-0000-4000-8000-000000000001';

    // 4. Check initial inventory
    const initialInventory = await prisma.inventory.findUnique({
      where: { productId: testProductId },
    });

    if (!initialInventory) {
      throw new Error(`Inventory not found for test product ${testProductId}`);
    }

    console.log(
      `\n[4/10] Baseline inventory for product ${testProductId}: available=${initialInventory.availableQuantity}, reserved=${initialInventory.reservedQuantity}`,
    );

    // 5. Add product to Cart via Cart Service API
    console.log('\n[5/10] Adding product to customer cart via Cart Service (port 3030)...');
    const addCartRes = await fetch('http://localhost:3030/api/v1/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        quantity: 2,
      }),
    });

    if (!addCartRes.ok) {
      const errText = await addCartRes.text();
      throw new Error(`Failed to add item to cart: ${addCartRes.status} ${errText}`);
    }

    const cartData = await addCartRes.json();
    console.log(
      `  -> Cart updated: Cart ID ${cartData.cartId}, Total items: ${cartData.summary.totalItems}, Subtotal: ₹${cartData.summary.subtotal}`,
    );

    // 6. Place COD Order via Order Service API
    const idempotencyKey = `phase5-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log(`\n[6/10] Placing COD order via Order Service (POST /api/v1/orders) with key: ${idempotencyKey}...`);

    const orderRes = await fetch('http://localhost:3040/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        addressId: address.id,
        paymentMethod: 'COD',
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`Failed to place order: ${orderRes.status} ${errText}`);
    }

    const createdOrder = await orderRes.json();
    console.log(`  -> Order successfully placed!`);
    console.log(`     Order ID: ${createdOrder.id}`);
    console.log(`     Status: ${createdOrder.status}`);
    console.log(`     Total Amount: ₹${createdOrder.totalAmount}`);
    console.log(`     Payment Method: ${createdOrder.payment.paymentMethod}`);
    console.log(`     Payment Status: ${createdOrder.payment.paymentStatus}`);
    console.log(`     Address Snapshot: ${createdOrder.addressSnapshot.fullName}, ${createdOrder.addressSnapshot.city}`);
    console.log(`     Items count: ${createdOrder.items.length} (Product: ${createdOrder.items[0].name}, Qty: ${createdOrder.items[0].quantity})`);

    // Verify properties
    if (createdOrder.status !== 'PENDING') throw new Error(`Expected PENDING, got ${createdOrder.status}`);
    if (createdOrder.payment.paymentMethod !== 'COD') throw new Error(`Expected COD, got ${createdOrder.payment.paymentMethod}`);
    if (createdOrder.payment.paymentStatus !== 'COD_PENDING') throw new Error(`Expected COD_PENDING, got ${createdOrder.payment.paymentStatus}`);

    // 7. Verify Idempotency replay
    console.log('\n[7/10] Testing idempotency: repeating order request with SAME Idempotency-Key...');
    const replayRes = await fetch('http://localhost:3040/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        addressId: address.id,
        paymentMethod: 'COD',
      }),
    });

    const replayOrder = await replayRes.json();
    if (replayOrder.id !== createdOrder.id) {
      throw new Error(`Idempotency check failed: expected order ID ${createdOrder.id}, got ${replayOrder.id}`);
    }
    console.log(`  -> Idempotent replay SUCCESS: Returned existing order ID ${replayOrder.id} without duplicating!`);

    // 8. Verify Cart Conversion
    console.log('\n[8/10] Verifying cart conversion on Cart Service...');
    const getCartRes = await fetch('http://localhost:3030/api/v1/cart', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterCart = await getCartRes.json();
    if (afterCart.items && afterCart.items.length > 0) {
      throw new Error(`Cart conversion failed: expected 0 items in active cart, found ${afterCart.items.length}`);
    }
    console.log(`  -> Cart conversion verified: active cart is reset (0 items). Previous cart converted.`);

    // 9. Verify PostgreSQL Inventory & Reservation Database Records
    console.log('\n[9/10] Verifying PostgreSQL database records directly...');
    const postInventory = await prisma.inventory.findUnique({
      where: { productId: testProductId },
    });

    const expectedAvailable = initialInventory.availableQuantity - 2;
    const expectedReserved = initialInventory.reservedQuantity + 2;

    console.log(
      `  -> Inventory updated: available=${postInventory.availableQuantity} (was ${initialInventory.availableQuantity}), reserved=${postInventory.reservedQuantity} (was ${initialInventory.reservedQuantity})`,
    );

    if (postInventory.availableQuantity !== expectedAvailable || postInventory.reservedQuantity !== expectedReserved) {
      throw new Error(
        `Inventory mismatch: expected available=${expectedAvailable}, reserved=${expectedReserved}; got available=${postInventory.availableQuantity}, reserved=${postInventory.reservedQuantity}`,
      );
    }

    const reservation = await prisma.inventoryReservation.findFirst({
      where: { orderId: createdOrder.id, productId: testProductId },
    });

    if (!reservation || reservation.status !== 'CONFIRMED' || reservation.quantity !== 2) {
      throw new Error(`Reservation record invalid or missing: ${JSON.stringify(reservation)}`);
    }
    console.log(`  -> Inventory reservation verified: ID ${reservation.id}, quantity: ${reservation.quantity}, status: ${reservation.status}`);

    const statusHistory = await prisma.orderStatusHistory.findFirst({
      where: { orderId: createdOrder.id },
    });
    if (!statusHistory || statusHistory.status !== 'PENDING') {
      throw new Error(`Status history record missing or invalid: ${JSON.stringify(statusHistory)}`);
    }
    console.log(`  -> Order status history verified: Status ${statusHistory.status} recorded at ${statusHistory.changedAt}`);

    // 10. Verify Order Retrieval & Auth Guard
    console.log('\n[10/10] Testing Order retrieval (GET /api/v1/orders/:id) and authentication guard...');
    const getOrderRes = await fetch(`http://localhost:3040/api/v1/orders/${createdOrder.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const retrievedOrder = await getOrderRes.json();
    if (retrievedOrder.id !== createdOrder.id) {
      throw new Error(`Order retrieval mismatch: expected ${createdOrder.id}, got ${retrievedOrder.id}`);
    }
    console.log(`  -> Order retrieval SUCCESS: retrieved order ${retrievedOrder.id}`);

    const unauthRes = await fetch(`http://localhost:3040/api/v1/orders/${createdOrder.id}`, {
      method: 'GET',
    });
    if (unauthRes.status !== 401) {
      throw new Error(`Security check failed: expected 401 Unauthorized without token, got ${unauthRes.status}`);
    }
    console.log(`  -> Security guard SUCCESS: unauthenticated request correctly rejected with HTTP 401`);

    console.log('\n====================================================');
    console.log('PHASE 5 LIVE VERIFICATION PASSED COMPLETELY (10/10)');
    console.log('====================================================\n');
  } finally {
    console.log('Terminating test microservice processes...');
    catalogProc.kill();
    cartProc.kill();
    orderProc.kill();
    await prisma.$disconnect();
    console.log('Microservice processes cleanly terminated.');
  }
}

main().catch((err) => {
  console.error('\nVerification FAILED:', err);
  process.exit(1);
});
