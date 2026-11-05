import {
  PrismaClient,
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Shopkart database seeding...");

  // 1. Roles
  const customerRole = await prisma.role.upsert({
    where: { name: "customer" },
    update: {},
    create: {
      name: "customer",
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
    },
  });

  console.log("Roles seeded.");

  // 2. Categories
  const electronics = await prisma.category.upsert({
    where: { id: "10000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Electronics",
      description: "Electronic devices and accessories",
    },
  });

  const fashion = await prisma.category.upsert({
    where: { id: "10000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "10000000-0000-4000-8000-000000000002",
      name: "Fashion",
      description: "Clothing and fashion accessories",
    },
  });

  const home = await prisma.category.upsert({
    where: { id: "10000000-0000-4000-8000-000000000003" },
    update: {},
    create: {
      id: "10000000-0000-4000-8000-000000000003",
      name: "Home & Kitchen",
      description: "Home and kitchen products",
    },
  });

  console.log("Categories seeded.");

  // 3. Products
  const products = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      categoryId: electronics.id,
      name: "Wireless Headphones",
      sku: "ELEC-001",
      description: "Wireless over-ear headphones",
      price: new Prisma.Decimal("2499.00"),
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      categoryId: electronics.id,
      name: "Smart Watch",
      sku: "ELEC-002",
      description: "Smart watch with fitness tracking",
      price: new Prisma.Decimal("3999.00"),
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      categoryId: fashion.id,
      name: "Cotton T-Shirt",
      sku: "FASH-001",
      description: "Comfortable cotton T-shirt",
      price: new Prisma.Decimal("599.00"),
    },
    {
      id: "20000000-0000-4000-8000-000000000004",
      categoryId: home.id,
      name: "Coffee Mug",
      sku: "HOME-001",
      description: "Ceramic coffee mug",
      price: new Prisma.Decimal("299.00"),
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log("Products seeded.");

  // 4. Inventory
  const inventoryItems = [
    {
      productId: "20000000-0000-4000-8000-000000000001",
      availableQuantity: 50,
    },
    {
      productId: "20000000-0000-4000-8000-000000000002",
      availableQuantity: 30,
    },
    {
      productId: "20000000-0000-4000-8000-000000000003",
      availableQuantity: 100,
    },
    {
      productId: "20000000-0000-4000-8000-000000000004",
      availableQuantity: 75,
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventory.upsert({
      where: { productId: item.productId },
      update: {},
      create: {
        productId: item.productId,
        availableQuantity: item.availableQuantity,
        reservedQuantity: 0,
      },
    });
  }

  console.log("Inventory seeded.");
  console.log("Shopkart database seeding completed.");

  // Avoid unused-variable warnings if strict TypeScript is enabled.
  console.log(
    `Created or verified roles: ${customerRole.name}, ${adminRole.name}`,
  );
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

