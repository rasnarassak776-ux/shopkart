# Merchant Inventory Enhancements — Implementation Report

## Features implemented

- Merchant stock management for owned products only, with audited increase/decrease/manual adjustments and mandatory reasons.
- Configurable per-product low-stock thresholds stored on `inventory.inventory`.
- Low-stock identification and one-time in-app alerts through the existing `notification.notifications` pipeline.
- Automatic out-of-stock marking through `catalog.products.out_of_stock`; public catalog/product reads now exclude out-of-stock products.
- Atomic checkout reservation, cancellation release, stock movement history, and low-stock/out-of-stock synchronization inside order transactions.
- Read-only stock movement history with product/merchant/date filters and pagination.
- Merchant inventory dashboard with summary cards, filters, stock actions, threshold editing, and history viewer.
- Superadmin platform inventory page with cross-merchant visibility, merchant filtering, audited adjustments, and history access.

## Database changes

Migration: `database/prisma/migrations/20261111130000_merchant_inventory_enhancements/migration.sql`

Applied with `npx prisma db execute` because the repository has a known broken migration folder that blocks `migrate dev/deploy`.

Changes:

- `catalog.products.out_of_stock BOOLEAN NOT NULL DEFAULT true`
- Backfilled `out_of_stock` from existing `inventory.inventory.available_quantity`.
- `inventory.inventory.low_stock_threshold INTEGER NOT NULL DEFAULT 0`
- `inventory.inventory.low_stock_alerted_at TIMESTAMPTZ(6)`
- New enum `inventory."StockMovementAction"`
- New table `inventory.stock_movements`
- Indexes on `(product_id, created_at)`, `(merchant_id, created_at)`, and `created_at`

Prisma schema updated in `database/prisma/schema.prisma`.

## Backend changes

### Catalog service

- `apps/catalog-service/src/admin/admin-inventory.service.ts`
  - Merchant/superadmin scoped inventory listing with search, status, merchant, and pagination.
  - Stock summary counts.
  - Increase/decrease/manual adjustment transactions.
  - Negative-stock rejection.
  - Low-stock threshold updates.
  - Low-stock alert de-duplication via `low_stock_alerted_at`.
  - In-app `LOW_STOCK_ALERT` notification creation for merchant-owned products.
  - Stock movement persistence.
  - Read-only paginated stock history.
- `apps/catalog-service/src/admin/admin.controller.ts`
  - Added inventory query/history and adjustment endpoints.
- `apps/catalog-service/src/admin/dto/inventory.dto.ts`
  - DTO validation for inventory queries, adjustments, thresholds, and history.
- `apps/catalog-service/src/products/products.service.ts`
  - New products start `outOfStock: true`.
  - Public product list/detail/slug queries exclude out-of-stock products.

### Order service

- `apps/order-service/src/inventory/inventory.service.ts`
  - Reservation now records `ORDER_RESERVED` stock movements.
  - Cancellation/item-cancellation release records `ORDER_CANCELLED` movements.
  - Stock changes synchronize `catalog.products.out_of_stock`.
  - Low-stock threshold/alert state is maintained during system stock changes.
- `apps/order-service/src/orders/orders.service.ts`
  - Passes actor/customer IDs and merchant IDs into inventory operations for accurate history and alerts.

## API endpoints

Catalog admin API, protected by JWT + merchant/superadmin role guards:

- `GET /api/v1/catalog/admin/inventory`
  - Query: `page`, `limit`, `status`, `search`, `merchantId` (superadmin only effective)
- `GET /api/v1/catalog/admin/inventory/history`
  - Query: `productId`, `merchantId`, `from`, `to`, `page`, `limit`
- `POST /api/v1/catalog/admin/inventory/:productId/increase`
  - Body: `{ quantity, reason }`
- `POST /api/v1/catalog/admin/inventory/:productId/decrease`
  - Body: `{ quantity, reason }`
- `POST /api/v1/catalog/admin/inventory/:productId/adjust`
  - Body: `{ quantityDelta, reason }`
- `PATCH /api/v1/catalog/admin/inventory/:productId/threshold`
  - Body: `{ lowStockThreshold }`

The previous absolute `PATCH /inventory/:productId` endpoint was replaced by reason-required adjustment endpoints.

## Frontend changes

- `apps/web/src/features/admin/admin-catalog-api.ts`
  - Typed inventory list/summary/history responses.
  - APIs for increase, decrease, manual adjustment, threshold update, and history.
- `apps/web/src/app/merchant/inventory/page.tsx`
  - Summary cards, search/status filters, product image/SKU/available/reserved/threshold/status columns.
  - Increase, decrease, threshold, and history actions.
- `apps/web/src/app/superadmin/inventory/page.tsx`
  - Platform-wide inventory view with merchant filter and audited adjust action.
- `apps/web/src/components/admin/admin-nav.ts`
  - Added `/superadmin/inventory` navigation.
- `apps/web/src/features/superadmin/superadmin.spec.ts`
  - Updated expected superadmin navigation.

## Authorization and data isolation

- All inventory admin routes require `JwtAuthGuard` + `RolesGuard` with `MERCHANT` or `SUPERADMIN`.
- Merchant stock reads/writes are scoped by `catalog.products.merchant_id = actor.id`; the frontend never supplies ownership.
- Superadmin can list/filter across merchants and perform manual adjustments.
- Platform-owned products (`merchant_id = null`) are visible to superadmin only.
- Stock history is read-only; there are no update/delete endpoints.
- Customer cancellation and merchant item cancellation release only the relevant reservations inside the existing order transactions.

## Test results

- `npx prisma validate --schema prisma/schema.prisma` — passed.
- `npx prisma db execute --file .../migration.sql --schema prisma/schema.prisma` — applied successfully.
- `npx tsc --noEmit -p apps/catalog-service/tsconfig.json` — passed.
- `npx tsc --noEmit -p apps/order-service/tsconfig.json` — passed.
- `cd apps/web && npx tsc --noEmit` — passed.
- `npm test -w catalog-service -- --runInBand` — 135/135 passed.
- `npm test -w order-service -- --runInBand` — 50/50 passed.
- `npm test -w web -- --runInBand` — 125/125 passed.

## Build results

Production builds were not run because all dev servers are currently listening on ports 3000, 3010, 3020, 3030, 3040, and 3050. Repository guidance warns that `nest build`/`next build` can overwrite live watch-mode output directories while those servers are running. TypeScript checks for all affected apps passed instead.

## Remaining limitations

- `ORDER_COMMITTED` and `PAYMENT_FAILED_RELEASE` action types exist in the schema for future payment workflows; the current COD flow records `ORDER_RESERVED` at checkout and `ORDER_CANCELLED` on cancellation.
- Low-stock alerts are in-app notifications only; no email template was added for low stock.
- Stock history records available-quantity movement, not a separate total-stock ledger, matching the current two-counter inventory design.
- `prisma generate` reported an EPERM rename warning for the query-engine DLL while services were running; schema validation and TypeScript compilation passed.
