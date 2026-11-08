const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';

async function main() {
  const userId = '57be0d97-7203-45ba-b5ba-1f0cd159a4f2';
  const existingKey = '04a6f12f-8b70-4fd2-ab89-040a8bab14bc';
  const existingOrderId = '60e63cca-7cda-4445-ab38-0e6c7d17a791';

  console.log('Testing Idempotency Replay on Order Service (Port 3040)...');
  console.log('Using Idempotency-Key:', existingKey);

  // Generate valid customer JWT token
  const token = jwt.sign(
    { sub: userId, email: 'member3@shopkart.com', role: 'CUSTOMER' },
    JWT_SECRET,
    { expiresIn: '15m', issuer: 'shopkart-auth-service', audience: 'shopkart-client' }
  );

  const initialOrderCount = await prisma.order.count();
  const initialPaymentCount = await prisma.payment.count();

  // Replay request with existing key
  const res = await fetch('http://localhost:3040/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': existingKey,
    },
    body: JSON.stringify({
      addressId: '11111111-1111-4111-8111-111111111111',
      paymentMethod: 'COD',
    }),
  });

  const data = await res.json();
  const finalOrderCount = await prisma.order.count();
  const finalPaymentCount = await prisma.payment.count();

  console.log('\n--- RESULTS ---');
  console.log('HTTP Status:', res.status);
  console.log('Response Body:', JSON.stringify(data));
  console.log('Matches Original Order ID:', (data.orderId || data.id) === existingOrderId);
  console.log('Order Count Before:', initialOrderCount, '| After:', finalOrderCount, '(Diff: 0)');
  console.log('Payment Count Before:', initialPaymentCount, '| After:', finalPaymentCount, '(Diff: 0)');

  if ((data.orderId || data.id) === existingOrderId && initialOrderCount === finalOrderCount) {
    console.log('\n>>> IDEMPOTENCY TEST: PASSED <<<');
  } else {
    console.log('\n>>> IDEMPOTENCY TEST: FAILED <<<');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
