-- Razorpay test-mode payments: gateway references, verification timestamp,
-- failure reason, currency and row update tracking on the existing payments table.
-- Idempotent: safe to re-run; existing COD rows are untouched.

ALTER TABLE "orders"."payments"
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "razorpay_order_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "razorpay_payment_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "payment_verified_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "failure_reason" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW();

-- Backfill currency for pre-existing rows (all current payments are INR).
UPDATE "orders"."payments" SET "currency" = 'INR' WHERE "currency" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_razorpay_order_id_key"
  ON "orders"."payments" ("razorpay_order_id");

CREATE INDEX IF NOT EXISTS "payments_razorpay_payment_id_idx"
  ON "orders"."payments" ("razorpay_payment_id");
