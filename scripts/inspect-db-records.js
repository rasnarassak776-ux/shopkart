/**
 * Read-Only PostgreSQL Records Inspector for Shopkart Member 3
 * Run with: node scripts/inspect-db-records.js
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n======================================================');
  console.log('       SHOPKART POSTGRESQL LIVE VERIFICATION');
  console.log('======================================================\n');

  // 1. Latest Order
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      payments: true,
      statusHistory: { orderBy: { changedAt: 'asc' } },
    },
  });

  if (!order) {
    console.log('No orders found in database.');
    return;
  }

  console.log('📦 1. LATEST ORDER (orders.orders)');
  console.log('------------------------------------------------------');
  console.log(`Order ID:     ${order.id}`);
  console.log(`Customer ID:  ${order.userId}`);
  console.log(`Status:       ${order.status}`);
  console.log(`Total Amount: ₹${order.totalAmount}`);
  console.log(`Created At:   ${order.createdAt.toLocaleString('en-IN')}`);
  console.log('\n📍 Address Snapshot (orders.orders.address_snapshot):');
  console.log(JSON.stringify(order.addressSnapshot, null, 2));

  console.log('\n📋 2. ORDER ITEMS SNAPSHOT (orders.order_items)');
  console.log('------------------------------------------------------');
  order.items.forEach((item, idx) => {
    console.log(`[Item #${idx + 1}]`);
    console.log(`  Product ID:   ${item.productId}`);
    console.log(`  Product Name: ${item.productNameSnapshot}`);
    console.log(`  Quantity:     ${item.quantity}`);
    console.log(`  Unit Price:   ₹${item.unitPriceSnapshot}`);
  });

  console.log('\n💳 3. PAYMENT RECORD (orders.payments)');
  console.log('------------------------------------------------------');
  order.payments.forEach((p, idx) => {
    console.log(`[Payment #${idx + 1}]`);
    console.log(`  Method:          ${p.paymentMethod}`);
    console.log(`  Status:          ${p.paymentStatus}`);
    console.log(`  Amount:          ₹${p.amount}`);
    console.log(`  Idempotency Key: ${p.idempotencyKey}`);
  });

  console.log('\n📜 4. ORDER STATUS HISTORY (orders.order_status_history)');
  console.log('------------------------------------------------------');
  order.statusHistory.forEach((h, idx) => {
    console.log(`  [Step #${idx + 1}] Status: ${h.status} at ${h.changedAt.toLocaleString('en-IN')}`);
  });

  // 2. Inventory Check
  if (order.items.length > 0) {
    const productId = order.items[0].productId;
    const inv = await prisma.inventory.findUnique({ where: { productId } });
    const res = await prisma.inventoryReservation.findMany({ where: { orderId: order.id } });

    console.log('\n📊 5. INVENTORY & RESERVATIONS (inventory.inventory)');
    console.log('------------------------------------------------------');
    console.log(`Product ID:         ${productId}`);
    console.log(`Available Quantity: ${inv?.availableQuantity}`);
    console.log(`Reserved Quantity:  ${inv?.reservedQuantity}`);
    res.forEach((r, idx) => {
      console.log(`Reservation #${idx + 1}: Qty = ${r.quantity}, Status = ${r.status}`);
    });
  }

  // 3. Cart Status
  const cart = await prisma.cart.findFirst({
    where: { userId: order.userId },
    orderBy: { updatedAt: 'desc' },
  });

  console.log('\n🛒 6. CART CONVERSION STATUS (cart.carts)');
  console.log('------------------------------------------------------');
  if (cart) {
    console.log(`Cart ID: ${cart.id}`);
    console.log(`Status:  ${cart.status} (Expected: CONVERTED)`);
  }

  console.log('\n======================================================\n');
}

main()
  .catch((err) => {
    console.error('Error connecting to database:', err.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
