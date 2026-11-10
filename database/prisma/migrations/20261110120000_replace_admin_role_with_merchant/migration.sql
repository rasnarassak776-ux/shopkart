-- Replace the `admin` role with `merchant` and add product ownership.
-- Idempotent: safe to re-run; existing users keep their role via role_id and
-- no user or product data is deleted.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "auth"."roles" WHERE "name" = 'admin') THEN
    IF EXISTS (SELECT 1 FROM "auth"."roles" WHERE "name" = 'merchant') THEN
      -- A merchant role already exists: repoint admin users to it, then drop
      -- the legacy admin role row.
      UPDATE "auth"."users"
      SET "role_id" = (SELECT "id" FROM "auth"."roles" WHERE "name" = 'merchant')
      WHERE "role_id" = (SELECT "id" FROM "auth"."roles" WHERE "name" = 'admin');

      DELETE FROM "auth"."roles" WHERE "name" = 'admin';
    ELSE
      -- Simple rename: users referencing the role via role_id automatically
      -- become merchants.
      UPDATE "auth"."roles" SET "name" = 'merchant' WHERE "name" = 'admin';
    END IF;
  END IF;
END $$;

-- Add merchant ownership to catalog products. Nullable so existing
-- (platform-owned) products are preserved; only superadmins can manage them.
ALTER TABLE "catalog"."products"
  ADD COLUMN IF NOT EXISTS "merchant_id" UUID;

CREATE INDEX IF NOT EXISTS "products_merchant_id_idx"
  ON "catalog"."products"("merchant_id");
