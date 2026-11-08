const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';

async function main() {
  const userId = '57be0d97-7203-45ba-b5ba-1f0cd159a4f2';
  const productId = '20000000-0000-4000-8000-000000000004'; // Coffee Mug
  const excessiveQuantity = 99999;

  console.log('Testing Insufficient Inventory Handling on Order Service...');

  // 1. Check current inventory before test
  const invBefore = await prisma.inventory.findUnique({ where: { productId } });
  const initialOrderCount = await prisma.order.count();
  console.log(`Current Available Stock: ${invBefore?.availableQuantity}`);
  console.log(`Attempting Order with Quantity: ${excessiveQuantity}`);

  // 2. Temporarily put item with excessive quantity in an isolated active cart for this test
  // Get active cart or create one
  let cart = await prisma.cart.findFirst({ where: { userId, status: 'ACTIVE' } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId, status: 'ACTIVE' } });
  }

  // Clear existing items and add excessive item
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      quantity: excessiveQuantity,
    },
  });

  const address = await prisma.address.findFirst({ where: { userId } });
  const token = jwt.sign(
    { sub: userId, email: 'member3@shopkart.com', role: 'CUSTOMER' },
    JWT_SECRET,
    { expiresIn: '15m', issuer: 'shopkart-auth-service', audience: 'shopkart-client' }
  );

  // 3. Attempt to place order
  const res = await fetch('http://localhost:3040/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': 'test-insufficient-' + Date.now(),
    },
    body: JSON.stringify({
      addressId: address.id,
      paymentMethod: 'COD',
    }),
  });

  const responseBody = await res.json();
  const invAfter = await prisma.inventory.findUnique({ where: { productId } });
  const finalOrderCount = await prisma.order.count();

  // 4. Clean up test cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  console.log('\n--- RESULTS ---');
  console.log('HTTP Status:', res.status, '(Expected: 400)');
  console.log('Response Message:', responseBody.message);
  console.log('Available Stock Before:', invBefore?.availableQuantity, '| After:', invAfter?.availableQuantity);
  console.log('Order Count Before:', initialOrderCount, '| After:', finalOrderCount);

  if (
    res.status === 400 &&
    responseBody.message.includes('Insufficient stock') &&
    invBefore?.availableQuantity === invAfter?.availableQuantity &&
    initialOrderCount === finalOrderCount
  ) {
    console.log('\n>>> INSUFFICIENT INVENTORY TEST: PASSED <<<');
  } else {
    console.log('\n>>> INSUFFICIENT INVENTORY TEST: FAILED <<<');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
