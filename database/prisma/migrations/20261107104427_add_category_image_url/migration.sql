-- AlterTable: add category image url
ALTER TABLE "catalog"."categories"
  ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(1000);
