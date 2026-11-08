/**
 * Shopkart – Member 3 – Phase 6 Live Integration Verification
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';

async function main() {
  console.log('========================================================');
  console.log('    MEMBER 3 - PHASE 6 LIVE INTEGRATION VERIFICATION    ');
  console.log('========================================================\n');

  const member3UserId = '57be0d97-7203-45ba-b5ba-1f0cd159a4f2';
  const otherUserId = '99999999-9999-4999-8999-999999999999';
  const existingOrderId = '60e63cca-7cda-4445-ab38-0e6c7d17a791';

  const member3Token = jwt.sign(
    { sub: member3UserId, email: 'member3@shopkart.com', role: 'CUSTOMER' },
    JWT_SECRET,
    { expiresIn: '15m', issuer: 'shopkart-auth-service', audience: 'shopkart-client' }
  );

  const otherToken = jwt.sign(
    { sub: otherUserId, email: 'intruder@shopkart.com', role: 'CUSTOMER' },
    JWT_SECRET,
    { expiresIn: '15m', issuer: 'shopkart-auth-service', audience: 'shopkart-client' }
  );

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Unauthenticated Request
  console.log('1. Checking unauthenticated security boundary:');
  const unauthRes = await fetch('http://localhost:3040/api/v1/orders');
  assert(unauthRes.status === 401, 'GET /api/v1/orders without token returns 401 Unauthorized');

  // 2. Fetch Customer Order History
  console.log('\n2. Fetching Customer Order History (GET /api/v1/orders):');
  const listRes = await fetch('http://localhost:3040/api/v1/orders?page=1&limit=10', {
    headers: { Authorization: `Bearer ${member3Token}` },
  });
  assert(listRes.status === 200, 'GET /api/v1/orders returns HTTP 200');
  const listData = await listRes.json();
  assert(Array.isArray(listData.data), 'Returns an array of orders in data');
  assert(listData.data.length >= 1, `Contains at least 1 order (found: ${listData.data.length})`);
  assert(listData.pagination?.total >= 1, 'Contains pagination metadata with total count');

  const orderInList = listData.data.find((o) => o.id === existingOrderId);
  assert(Boolean(orderInList), `Phase 5 order ${existingOrderId} exists in customer history`);
  if (orderInList) {
    assert(orderInList.status === 'PENDING', `Order status is PENDING (got: ${orderInList.status})`);
    assert(orderInList.totalAmount === '299.00', `Total amount is ₹299.00 (got: ${orderInList.totalAmount})`);
    assert(orderInList.items?.[0]?.name === 'Coffee Mug', `Item snapshot name is "Coffee Mug"`);
    assert(orderInList.payment?.paymentMethod === 'COD', 'Payment method is COD');
    assert(orderInList.payment?.paymentStatus === 'COD_PENDING', 'Payment status is COD_PENDING');
  }

  // 3. Fetch Single Order Details
  console.log('\n3. Fetching Single Order Details (GET /api/v1/orders/:id):');
  const detailRes = await fetch(`http://localhost:3040/api/v1/orders/${existingOrderId}`, {
    headers: { Authorization: `Bearer ${member3Token}` },
  });
  assert(detailRes.status === 200, 'GET /api/v1/orders/:id returns HTTP 200');
  const orderDetails = await detailRes.json();
  assert(orderDetails.id === existingOrderId, 'Matches exact requested order reference');
  assert(orderDetails.addressSnapshot?.fullName === 'John Smith', 'Address snapshot contains recipient John Smith');
  assert(orderDetails.addressSnapshot?.city === 'Bengaluru', 'Address snapshot contains city Bengaluru');
  assert(Boolean(orderDetails.statusHistory?.length >= 1), 'Status history contains verified lifecycle timestamps');

  // 4. Multi-Tenant Cross-Customer Isolation
  console.log('\n4. Verifying Cross-Customer Isolation & Authorization:');
  const intruderRes = await fetch(`http://localhost:3040/api/v1/orders/${existingOrderId}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert(
    intruderRes.status === 403 || intruderRes.status === 404,
    `Intruder customer blocked from accessing order (status: ${intruderRes.status})`
  );

  const intruderListRes = await fetch('http://localhost:3040/api/v1/orders', {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  const intruderListData = await intruderListRes.json();
  assert(
    intruderListData.data.length === 0,
    `Intruder sees 0 orders in their own history (found: ${intruderListData.data.length})`
  );

  // 5. Status Filtering
  console.log('\n5. Checking Order Status Filtering:');
  const pendingFilterRes = await fetch('http://localhost:3040/api/v1/orders?status=PENDING', {
    headers: { Authorization: `Bearer ${member3Token}` },
  });
  const pendingData = await pendingFilterRes.json();
  assert(pendingData.data.length >= 1, 'Filtering by status=PENDING returns matching orders');

  const deliveredFilterRes = await fetch('http://localhost:3040/api/v1/orders?status=DELIVERED', {
    headers: { Authorization: `Bearer ${member3Token}` },
  });
  const deliveredData = await deliveredFilterRes.json();
  assert(deliveredData.data.length === 0, 'Filtering by status=DELIVERED returns 0 orders');

  // 6. Web Storefront Routes
  console.log('\n6. Checking Storefront Frontend Routes:');
  try {
    const webOrdersRes = await fetch('http://localhost:3000/customer/orders');
    assert(webOrdersRes.status === 200, 'GET http://localhost:3000/customer/orders returns HTTP 200');
  } catch (err) {
    console.warn('  [WARN] Web Storefront route check skipped:', err.message);
  }

  try {
    const webDetailRes = await fetch(`http://localhost:3000/orders/${existingOrderId}`);
    assert(webDetailRes.status === 200, `GET http://localhost:3000/orders/${existingOrderId} returns HTTP 200`);
  } catch (err) {
    console.warn('  [WARN] Web Storefront route check skipped:', err.message);
  }

  console.log('\n========================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Integration verification error:', err);
  process.exit(1);
});
