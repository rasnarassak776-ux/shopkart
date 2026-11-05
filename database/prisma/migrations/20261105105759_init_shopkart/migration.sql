-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cart";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "orders";

-- CreateEnum
CREATE TYPE "cart"."CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "orders"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "orders"."PaymentMethod" AS ENUM ('ONLINE', 'COD');

-- CreateEnum
CREATE TYPE "orders"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'COD_PENDING', 'COD_COLLECTED');

-- CreateEnum
CREATE TYPE "inventory"."ReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "notification"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "auth"."roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."users" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(15) NOT NULL,
    "country" VARCHAR(80) NOT NULL DEFAULT 'India',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."products" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "sku" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "image_url" VARCHAR(1000) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart"."carts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "cart"."CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart"."cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "orders"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" VARCHAR(180) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_snapshot" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_method" "orders"."PaymentMethod" NOT NULL,
    "payment_status" "orders"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "transaction_reference" VARCHAR(255),
    "idempotency_key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "orders"."OrderStatus" NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."inventory" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "available_quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."inventory_reservations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "inventory"."ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "notification"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "auth"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "auth"."users"("role_id");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "auth"."addresses"("user_id");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "catalog"."categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "catalog"."products"("sku");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "catalog"."products"("category_id");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "catalog"."products"("name");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "catalog"."product_images"("product_id");

-- CreateIndex
CREATE INDEX "carts_user_id_status_idx" ON "cart"."carts"("user_id", "status");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart"."cart_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart"."cart_items"("cart_id", "product_id");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"."orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"."orders"("status");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "orders"."order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "orders"."payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "orders"."payments"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "orders"."order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_product_id_key" ON "inventory"."inventory"("product_id");

-- CreateIndex
CREATE INDEX "inventory_reservations_order_id_idx" ON "inventory"."inventory_reservations"("order_id");

-- CreateIndex
CREATE INDEX "inventory_reservations_product_id_idx" ON "inventory"."inventory_reservations"("product_id");

-- CreateIndex
CREATE INDEX "inventory_reservations_status_expires_at_idx" ON "inventory"."inventory_reservations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notification"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notification"."notifications"("status");

-- AddForeignKey
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "catalog"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart"."cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart"."carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
