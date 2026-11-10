# Shopkart – agent notes

## Verification commands
- Typecheck a service: `npx tsc --noEmit -p apps/<service>/tsconfig.json`; web: `cd apps/web && npx tsc --noEmit`
- Tests (Jest, `*.spec.ts`): `npm test -w auth-service`, `-w web`, `-w catalog-service`, `-w cart-service`, `-w order-service`
- After editing `packages/common/src`, rebuild it (`npm run build -w @shopkart/common`); NestJS services consume `dist/`, while Jest maps to `src/`.
- Dev servers usually run in watch mode (web :3000, auth :3010, catalog :3020, cart :3030, order :3040). Avoid `next build` / `nest build` while they run, because both overwrite the live output dirs.

## Database
- `database/prisma/migrations/20261107104427_add_category_image_url/` exists locally with no `migration.sql`, which blocks `prisma migrate dev/deploy` (P3015). Do not run `migrate dev` against the shared dev DB, since drift there can trigger a reset. Apply new idempotent SQL with `npx prisma db execute --file … --schema prisma/schema.prisma`.
- `prisma generate` may fail with EPERM renaming the query-engine DLL while services are running. The JS/TS client is still regenerated.

## Auth / RBAC
- See `docs/authentication-rbac.md`. Roles: customer, admin, superadmin. Superadmin access to admin features must be explicit: `@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)`.
- Superadmin provisioning: `npm run bootstrap:superadmin -w auth-service` with `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` set.
