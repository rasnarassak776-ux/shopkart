-- AlterTable
ALTER TABLE "catalog"."categories" ADD COLUMN "slug" VARCHAR(140);
ALTER TABLE "catalog"."categories" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "catalog"."product_images" ADD COLUMN "alt_text" VARCHAR(255);
ALTER TABLE "catalog"."product_images" ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "catalog"."products" ADD COLUMN "brand" VARCHAR(100);
ALTER TABLE "catalog"."products" ADD COLUMN "slug" VARCHAR(200);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "catalog"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "catalog"."categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "catalog"."products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "catalog"."products"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_is_active_idx" ON "catalog"."products"("category_id", "is_active");
