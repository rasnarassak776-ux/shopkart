-- AlterTable: extend notifications table with title, channel, recipient, read_at, error, metadata
ALTER TABLE "notification"."notifications"
  ADD COLUMN IF NOT EXISTS "title" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "channel" VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
  ADD COLUMN IF NOT EXISTS "recipient" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "error" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx"
  ON "notification"."notifications"("user_id", "read_at");

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notification"."notifications"("user_id", "created_at" DESC);
