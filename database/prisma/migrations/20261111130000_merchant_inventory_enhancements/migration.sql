-- Merchant inventory enhancements: low-stock thresholds, out-of-stock flag, and stock movement history.
ALTER TABLE "catalog"."products"
  ADD COLUMN IF NOT EXISTS "out_of_stock" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "inventory"."inventory"
  ADD COLUMN IF NOT EXISTS "low_stock_threshold" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "low_stock_alerted_at" TIMESTAMPTZ(6);

-- Products with no sellable stock start out of stock; products with available stock remain purchasable.
UPDATE "catalog"."products" p
SET "out_of_stock" = NOT EXISTS (
  SELECT 1 FROM "inventory"."inventory" i
  WHERE i."product_id" = p."id" AND i."available_quantity" > 0
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'inventory' AND t.typname = 'StockMovementAction') THEN
    CREATE TYPE "inventory"."StockMovementAction" AS ENUM (
      'INITIAL_STOCK',
      'STOCK_ADDED',
      'STOCK_REDUCED',
      'ORDER_RESERVED',
      'ORDER_COMMITTED',
      'ORDER_CANCELLED',
      'PAYMENT_FAILED_RELEASE',
      'MANUAL_ADJUSTMENT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "inventory"."stock_movements" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "merchant_id" UUID,
  "previous_quantity" INTEGER NOT NULL,
  "quantity_changed" INTEGER NOT NULL,
  "new_quantity" INTEGER NOT NULL,
  "action_type" "inventory"."StockMovementAction" NOT NULL,
  "reason" VARCHAR(500),
  "user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_movements_product_id_created_at_idx" ON "inventory"."stock_movements"("product_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "stock_movements_merchant_id_created_at_idx" ON "inventory"."stock_movements"("merchant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "inventory"."stock_movements"("created_at" DESC);
