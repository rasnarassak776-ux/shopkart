const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_min_32_chars_placeholder';

async function main() {
  const userId = '57be0d97-7203-45ba-b5ba-1f0cd159a4f2';

  const token = jwt.sign(
    { sub: userId, email: 'member3@shopkart.com', role: 'CUSTOMER' },
    JWT_SECRET,
    { expiresIn: '15m', issuer: 'shopkart-auth-service', audience: 'shopkart-client' }
  );

  console.log('Testing GET /api/v1/orders...');
  const res = await fetch('http://localhost:3040/api/v1/orders?page=1&limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Total Orders:', data.total);
  console.log('Pagination:', JSON.stringify(data.pagination));
  console.log('First Order ID:', data.data?.[0]?.id);
  console.log('First Order Items Count:', data.data?.[0]?.items?.length);
  console.log('First Order Status:', data.data?.[0]?.status);
  console.log('First Order Payment:', JSON.stringify(data.data?.[0]?.payment));
  console.log('First Order Timeline Steps:', data.data?.[0]?.statusHistory?.length);

  // Test alias GET /api/v1/orders/my-orders
  const resAlias = await fetch('http://localhost:3040/api/v1/orders/my-orders?page=1&limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Alias HTTP Status:', resAlias.status);

  // Test unauthenticated
  const resUnauth = await fetch('http://localhost:3040/api/v1/orders');
  console.log('Unauthenticated HTTP Status (Expected 401):', resUnauth.status);

  // Test invalid page
  const resInvalid = await fetch('http://localhost:3040/api/v1/orders?page=0', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Invalid Page HTTP Status (Expected 400):', resInvalid.status);

  // Test invalid status
  const resInvalidStatus = await fetch('http://localhost:3040/api/v1/orders?status=INVALID_STATUS', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Invalid Status HTTP Status (Expected 400):', resInvalidStatus.status);
}

main().catch(console.error);
