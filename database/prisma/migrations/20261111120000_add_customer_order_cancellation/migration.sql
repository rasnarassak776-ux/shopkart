-- Customer order cancellation support.
-- Persists cancellation reason/comment/timestamp on orders and adds a
-- REFUND_PENDING payment status so paid orders can record a pending refund
-- until an automated/manual refund is confirmed.

ALTER TABLE "orders"."orders"
  ADD COLUMN IF NOT EXISTS "cancellation_reason" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "cancellation_comment" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ(6);

ALTER TYPE "orders"."PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
