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
    update: { slug: "electronics" },
    create: {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Electronics",
      slug: "electronics",
      description: "Electronic devices and accessories",
    },
  });

  const fashion = await prisma.category.upsert({
    where: { id: "10000000-0000-4000-8000-000000000002" },
    update: { slug: "fashion" },
    create: {
      id: "10000000-0000-4000-8000-000000000002",
      name: "Fashion",
      slug: "fashion",
      description: "Clothing and fashion accessories",
    },
  });

  const home = await prisma.category.upsert({
    where: { id: "10000000-0000-4000-8000-000000000003" },
    update: { slug: "home-and-kitchen" },
    create: {
      id: "10000000-0000-4000-8000-000000000003",
      name: "Home & Kitchen",
      slug: "home-and-kitchen",
      description: "Home and kitchen products",
    },
  });

  const beauty = await prisma.category.upsert({
    where: { id: "10000000-0000-4000-8000-000000000004" },
    update: { slug: "beauty" },
    create: {
      id: "10000000-0000-4000-8000-000000000004",
      name: "Beauty",
      slug: "beauty",
      description: "Skincare and beauty products",
    },
  });

  console.log("Categories seeded.");

  // 3. Products
  const products = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      categoryId: electronics.id,
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      sku: "ELEC-001",
      description: "Wireless over-ear headphones",
      price: new Prisma.Decimal("2499.00"),
      brand: "SoundMaster",
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      categoryId: electronics.id,
      name: "Smart Watch",
      slug: "smart-watch",
      sku: "ELEC-002",
      description: "Smart watch with fitness tracking",
      price: new Prisma.Decimal("3999.00"),
      brand: "FitLife",
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      categoryId: fashion.id,
      name: "Cotton T-Shirt",
      slug: "cotton-t-shirt",
      sku: "FASH-001",
      description: "Comfortable cotton T-shirt",
      price: new Prisma.Decimal("599.00"),
      brand: "UrbanStyle",
    },
    {
      id: "20000000-0000-4000-8000-000000000004",
      categoryId: home.id,
      name: "Coffee Mug",
      slug: "coffee-mug",
      sku: "HOME-001",
      description: "Ceramic coffee mug",
      price: new Prisma.Decimal("299.00"),
      brand: "Ceramix",
    },
    {
      id: "20000000-0000-4000-8000-000000000005",
      categoryId: electronics.id,
      name: "Bluetooth Speaker",
      slug: "bluetooth-speaker",
      sku: "ELEC-003",
      description: "Portable Bluetooth speaker with deep bass",
      price: new Prisma.Decimal("1799.00"),
      brand: "SoundMaster",
    },
    {
      id: "20000000-0000-4000-8000-000000000006",
      categoryId: electronics.id,
      name: "Mechanical Keyboard",
      slug: "mechanical-keyboard",
      sku: "ELEC-004",
      description: "Hot-swappable mechanical keyboard with RGB",
      price: new Prisma.Decimal("3499.00"),
      brand: "TechNova",
    },
    {
      id: "20000000-0000-4000-8000-000000000007",
      categoryId: fashion.id,
      name: "Running Shoes",
      slug: "running-shoes",
      sku: "FASH-002",
      description: "Lightweight knit running shoes",
      price: new Prisma.Decimal("2799.00"),
      brand: "Stride",
    },
    {
      id: "20000000-0000-4000-8000-000000000008",
      categoryId: fashion.id,
      name: "Denim Jacket",
      slug: "denim-jacket",
      sku: "FASH-003",
      description: "Classic regular-fit denim jacket",
      price: new Prisma.Decimal("2199.00"),
      brand: "UrbanStyle",
    },
    {
      id: "20000000-0000-4000-8000-000000000009",
      categoryId: home.id,
      name: "Air Fryer",
      slug: "air-fryer",
      sku: "HOME-002",
      description: "5.5L digital air fryer with presets",
      price: new Prisma.Decimal("4499.00"),
      brand: "ChefPro",
    },
    {
      id: "20000000-0000-4000-8000-000000000010",
      categoryId: home.id,
      name: "Dinner Set",
      slug: "dinner-set",
      sku: "HOME-003",
      description: "12-piece stoneware dinner set",
      price: new Prisma.Decimal("3299.00"),
      brand: "Ceramix",
    },
    {
      id: "20000000-0000-4000-8000-000000000011",
      categoryId: beauty.id,
      name: "Vitamin C Serum",
      slug: "vitamin-c-serum",
      sku: "BEAUTY-001",
      description: "Brightening vitamin C face serum",
      price: new Prisma.Decimal("899.00"),
      brand: "GlowLab",
    },
    {
      id: "20000000-0000-4000-8000-000000000012",
      categoryId: beauty.id,
      name: "Matte Lipstick",
      slug: "matte-lipstick",
      sku: "BEAUTY-002",
      description: "Long-wear matte lipstick",
      price: new Prisma.Decimal("499.00"),
      brand: "GlowLab",
    },
  ];

  for (const product of products) {
    const { id, ...data } = product;
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: data,
      create: product,
    });
    void id;
  }

  console.log("Products seeded.");

  // 3b. Product images (Unsplash, see apps/web next.config remotePatterns)
  const unsplash = (id: string, width = 900) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

  const productImages = [
    ["30000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000001", "1505740420928-5e560c06d30e", "Black wireless headphones on a yellow background"],
    ["30000000-0000-4000-8000-000000000002", "20000000-0000-4000-8000-000000000002", "1546868871-7041f2a55e12", "Black smartwatch with a vivid watch face"],
    ["30000000-0000-4000-8000-000000000003", "20000000-0000-4000-8000-000000000003", "1556905055-8f358a7a47b2", "Folded knitwear and denim apparel"],
    ["30000000-0000-4000-8000-000000000004", "20000000-0000-4000-8000-000000000004", "1507473885765-e6ed057f782c", "Grey adjustable desk lamp"],
    ["30000000-0000-4000-8000-000000000005", "20000000-0000-4000-8000-000000000005", "1544441893-675973e31985", "Portable bluetooth speaker"],
    ["30000000-0000-4000-8000-000000000006", "20000000-0000-4000-8000-000000000006", "1585155770447-2f66e2a397b5", "Mechanical keyboard with backlit keys"],
    ["30000000-0000-4000-8000-000000000007", "20000000-0000-4000-8000-000000000007", "1491553895911-0055eca6402d", "Grey knit running shoe"],
    ["30000000-0000-4000-8000-000000000008", "20000000-0000-4000-8000-000000000008", "1596462502278-27bfdc403348", "Denim jacket on a hanger"],
    ["30000000-0000-4000-8000-000000000009", "20000000-0000-4000-8000-000000000009", "1618354691373-d851c5c3a990", "Modern kitchen appliance"],
    ["30000000-0000-4000-8000-000000000010", "20000000-0000-4000-8000-000000000010", "1513694203232-719a280e022f", "Stoneware dinner set"],
    ["30000000-0000-4000-8000-000000000011", "20000000-0000-4000-8000-000000000011", "1612817288484-6f916006741a", "Skincare serum bottles with stones"],
    ["30000000-0000-4000-8000-000000000012", "20000000-0000-4000-8000-000000000012", "1572635196237-14b3f281503f", "Beauty product flat lay"],
  ] as const;

  for (const [id, productId, photoId, altText] of productImages) {
    await prisma.productImage.upsert({
      where: { id },
      update: {},
      create: {
        id,
        productId,
        imageUrl: unsplash(photoId),
        altText,
        displayOrder: 0,
        isPrimary: true,
      },
    });
  }

  console.log("Product images seeded.");

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

