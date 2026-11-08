process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://shopkart_admin:shopkartdb123@localhost:5433/shopkart?schema=public";
process.env.NODE_ENV = 'development';

const { NestFactory } = require('@nestjs/core');

async function testService(name, modulePath, port) {
  console.log(`\n================ Testing ${name} ================`);
  const { AppModule } = require(modulePath);
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  await app.listen(port);
  console.log(`${name} listening on port ${port}`);

  try {
    const healthRes = await fetch(`http://localhost:${port}/api/v1/health`);
    const healthJson = await healthRes.json();
    console.log(`[GET /api/v1/health] status: ${healthRes.status}`, JSON.stringify(healthJson));

    const dbRes = await fetch(`http://localhost:${port}/api/v1/health/db-verify`);
    const dbJson = await dbRes.json();
    console.log(`[GET /api/v1/health/db-verify] (dev) status: ${dbRes.status}`, JSON.stringify(dbJson));

    // Test production mode behavior
    process.env.NODE_ENV = 'production';
    const dbProdRes = await fetch(`http://localhost:${port}/api/v1/health/db-verify`);
    const dbProdJson = await dbProdRes.json();
    console.log(`[GET /api/v1/health/db-verify] (prod) status: ${dbProdRes.status}`, JSON.stringify(dbProdJson));
    process.env.NODE_ENV = 'development';
  } finally {
    await app.close();
    console.log(`${name} shut down gracefully.`);
  }
}

async function run() {
  try {
    await testService('Cart Service', '../apps/cart-service/dist/app.module', 3030);
    await testService('Order Service', '../apps/order-service/dist/app.module', 3040);
    console.log('\nAll service health checks completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Service test error:', err);
    process.exit(1);
  }
}

run();
