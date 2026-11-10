-- Superadmin RBAC foundation.
-- Written idempotently (IF NOT EXISTS / ON CONFLICT) so it is safe to apply on
-- databases where the role was already created by `prisma db seed`.

-- Ensure the superadmin role exists alongside customer/admin in auth.roles.
INSERT INTO "auth"."roles" ("id", "name", "created_at")
VALUES (gen_random_uuid(), 'superadmin', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- CreateTable
CREATE TABLE IF NOT EXISTS "auth"."audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "target_user_id" UUID,
    "metadata" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "auth"."audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_target_user_id_idx" ON "auth"."audit_logs"("target_user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "auth"."audit_logs"("created_at");
