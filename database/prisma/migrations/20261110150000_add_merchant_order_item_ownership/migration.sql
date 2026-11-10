-- Add merchant ownership and fulfillment status to order items.
ALTER TABLE "orders"."order_items"
  ADD COLUMN IF NOT EXISTS "merchant_id" UUID,
  ADD COLUMN IF NOT EXISTS "status" "orders"."OrderStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "order_items_merchant_id_idx"
  ON "orders"."order_items"("merchant_id");

CREATE INDEX IF NOT EXISTS "order_items_order_id_merchant_id_idx"
  ON "orders"."order_items"("order_id", "merchant_id");

-- Add optional merchant_id and notes to order_status_history
ALTER TABLE "orders"."order_status_history"
  ADD COLUMN IF NOT EXISTS "merchant_id" UUID,
  ADD COLUMN IF NOT EXISTS "notes" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "order_status_history_merchant_id_idx"
  ON "orders"."order_status_history"("merchant_id");

-- Backfill existing order items with the merchant_id from catalog.products where available
UPDATE "orders"."order_items" oi
SET "merchant_id" = p."merchant_id"
FROM "catalog"."products" p
WHERE oi."product_id" = p."id"
  AND oi."merchant_id" IS NULL
  AND p."merchant_id" IS NOT NULL;

-- Backfill order item status to match the parent order's status for historical consistency
UPDATE "orders"."order_items" oi
SET "status" = o."status"
FROM "orders"."orders" o
WHERE oi."order_id" = o."id";
