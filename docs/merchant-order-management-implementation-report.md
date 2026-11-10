# Shopkart — Merchant Order Management Implementation Report

**Author:** Member 3 (Order Service Lead)  
**Date:** November 10, 2026  
**Branch:** `feature/merchant-order-management`  
**Status:** Complete & Fully Verified  

---

## 1. Executive Summary

Shopkart's order management architecture has been upgraded to a secure, multi-tenant **Merchant Order Management** system. This replaces monolithic single-tenant administration with strict **merchant-level data isolation** and item-level fulfillment tracking, while allowing platform superadmins complete governance and audit visibility.

### Key Capabilities Delivered
1. **Multi-Tenant Role Enforcement:** Three strictly governed roles: `customer`, `merchant`, and `superadmin`. All authorization is verified cryptographically via NestJS `RolesGuard` and JWT verification.
2. **Merchant Order Isolation:** Merchants accessing `/merchant/orders` or `/merchant/orders/:id` see **only** orders containing their products, only the order items they own, and their merchant-specific financial subtotal. Private items and platform revenue belonging to other merchants are completely hidden.
3. **Item-Level Fulfillment Lifecycle:** Each order item tracks its own independent fulfillment status (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED` and `CANCELLED`). An aggregate customer-facing status is computed dynamically.
4. **Scoped Inventory Safety:** When an order item or merchant sub-order is cancelled, reserved stock is released **only** for the affected merchant's products via `releaseStockForItemsInTx`. Other merchants' reserved stock remains untouched.
5. **Automated COD Settlement:** When all items across an order reach `DELIVERED`, Cash on Delivery (COD) payment status automatically transitions to `COD_COLLECTED`.
6. **Superadmin Governance:** Superadmins retain full cross-merchant order visibility, can inspect merchant attribution, and can filter orders by specific merchant (`?merchantId=<uuid>`).
7. **Frontend Console Modernization:** Next.js `/merchant/orders` and `/merchant/orders/[id]` equipped with real-time metric cards (Total, Pending, Processing, Shipped, Delivered), Order ID search, lifecycle transition actions, confirmation modals, and automatic URL redirects from legacy `/admin` paths.

---

## 2. Database Schema & Migration Details

### Migration: `20261110150000_add_merchant_order_item_ownership`
Location: `database/prisma/migrations/20261110150000_add_merchant_order_item_ownership/migration.sql`

```sql
-- 1. Add immutable merchant snapshot and item-level fulfillment status to order_items
ALTER TABLE "orders"."order_items" 
  ADD COLUMN IF NOT EXISTS "merchant_id" UUID,
  ADD COLUMN IF NOT EXISTS "status" "orders"."OrderStatus" NOT NULL DEFAULT 'PENDING';

-- 2. Add merchant attribution and notes to status history
ALTER TABLE "orders"."order_status_history" 
  ADD COLUMN IF NOT EXISTS "merchant_id" UUID,
  ADD COLUMN IF NOT EXISTS "notes" VARCHAR(255);

-- 3. Backfill merchant_id from products table for historical records
UPDATE "orders"."order_items" oi
SET "merchant_id" = p."merchant_id"
FROM "catalog"."products" p
WHERE oi."product_id" = p."id" AND oi."merchant_id" IS NULL;

-- 4. Backfill status on items from parent order status
UPDATE "orders"."order_items" oi
SET "status" = o."status"
FROM "orders"."orders" o
WHERE oi."order_id" = o."id";

-- 5. Performance and isolation indexes
CREATE INDEX IF NOT EXISTS "order_items_merchant_id_idx" 
  ON "orders"."order_items" ("merchant_id");
CREATE INDEX IF NOT EXISTS "order_items_order_id_merchant_id_idx" 
  ON "orders"."order_items" ("order_id", "merchant_id");
CREATE INDEX IF NOT EXISTS "order_status_history_merchant_id_idx" 
  ON "orders"."order_status_history" ("merchant_id");
```

### Prisma Schema Updates (`database/prisma/schema.prisma`)
- Added `merchantId String? @map("merchant_id") @db.Uuid` to `OrderItem`.
- Added `status OrderStatus @default(PENDING) @map("status")` to `OrderItem`.
- Added `merchantId String? @map("merchant_id") @db.Uuid` to `OrderStatusHistory`.
- Added `notes String? @map("notes") @db.VarChar(255)` to `OrderStatusHistory`.

---

## 3. Order Service Backend Architecture (`apps/order-service`)

### API Endpoints
| HTTP Method | Route | Authorization Guard | Description |
|---|---|---|---|
| `GET` | `/api/v1/orders/merchant` | `@Roles(MERCHANT, SUPERADMIN)` | Returns paginated orders containing caller's products, filtered items, and merchant subtotal. Superadmin can pass `?merchantId=...`. |
| `GET` | `/api/v1/orders/merchant/:id` | `@Roles(MERCHANT, SUPERADMIN)` | Returns order details showing only caller's items and merchant subtotal. Returns 404 if merchant owns no items in order. |
| `PATCH` | `/api/v1/orders/merchant/:id/status` | `@Roles(MERCHANT, SUPERADMIN)` | Updates fulfillment status for merchant's items, evaluates lifecycle rules, triggers scoped stock release on cancellation, updates aggregate order status, and triggers COD collection. |
| `GET` | `/api/v1/orders/admin` | `@Roles(MERCHANT, SUPERADMIN)` | Backward-compatible console alias delegating to `getMerchantOrders`. |
| `GET` | `/api/v1/orders/admin/:id` | `@Roles(MERCHANT, SUPERADMIN)` | Backward-compatible console alias delegating to `getMerchantOrderById`. |
| `PATCH` | `/api/v1/orders/admin/:id/status` | `@Roles(MERCHANT, SUPERADMIN)` | Backward-compatible console alias delegating to `updateMerchantOrderStatus`. |

### Lifecycle Transition Matrix
Each item transition is validated against:
- `PENDING` → `CONFIRMED`, `CANCELLED`
- `CONFIRMED` → `PROCESSING`, `CANCELLED`
- `PROCESSING` → `SHIPPED`, `CANCELLED`
- `SHIPPED` → `DELIVERED`
- `DELIVERED` → `[]` (Terminal)
- `CANCELLED` → `[]` (Terminal)

### Mixed-Merchant Order Handling
In multi-vendor cart orders (e.g. Order #101 contains Merchant A's laptop and Merchant B's headphones):
1. **Merchant A view:** Sees only the laptop, quantity, price snapshot, and subtotal ($1000). The headphones and platform total are omitted.
2. **Merchant B view:** Sees only the headphones, quantity, price snapshot, and subtotal ($50).
3. **Item Status Transitions:** Merchant A can transition the laptop from `PENDING` to `CONFIRMED` independently. Merchant B's headphones remain `PENDING`.
4. **Aggregate Order Calculation:**
   - If all items `DELIVERED` → Order is `DELIVERED` (and COD payment collected).
   - If all items `CANCELLED` → Order is `CANCELLED`.
   - If any item `SHIPPED` → Order is `SHIPPED`.
   - If any item `PROCESSING` → Order is `PROCESSING`.
   - If any item `CONFIRMED` → Order is `CONFIRMED`.
   - Else → Order is `PENDING`.
5. **Customer view:** The customer retains full visibility of all items, combined shipping status, and total order payment.

---

## 4. Frontend Console Architecture (`apps/web`)

### UI Components Updated
- **`apps/web/next.config.mjs`**: Added permanent/temporary redirects from `/admin` and `/admin/:path*` to `/merchant` and `/merchant/:path*`.
- **`apps/web/src/features/admin/admin-overview.tsx`**: Updated Overview module grid: `Orders` marked `Live` (`/merchant/orders`), `Products` marked `Live`, and Quick Actions updated with "Manage orders".
- **`apps/web/src/features/orders/components/merchant-order-list.tsx`**:
  - Live metric cards: Total Orders, Pending Orders, Processing Orders, Shipped Orders, Delivered Orders.
  - Status filter pill buttons (`ALL`, `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
  - Order ID search bar with submit and clear actions.
  - Pagination controls (Previous / Next with total count).
  - Refresh button.
- **`apps/web/src/features/orders/components/order-details.tsx`**:
  - Added `Fulfillment Management` card in the sidebar for merchant view.
  - Dropdown selector for next valid status transitions.
  - Confirmation warning when selecting `CANCELLED` (explaining reserved inventory release).
  - COD settlement notice when selecting `DELIVERED`.
  - Optional admin / fulfillment notes input.
  - "Apply Status Transition" button with loading spinner and toast notifications.
  - Displays terminal state notice when order reaches `DELIVERED` or `CANCELLED`.

---

## 5. Verification & Test Results

### 1. Backend Automated Tests (`apps/order-service`)
Command: `npm --workspace=apps/order-service test`
```
PASS src/orders/orders.concurrency.spec.ts (5.116 s)
PASS src/health/health.controller.spec.ts (6.521 s)
PASS src/inventory/inventory.service.spec.ts (6.585 s)
PASS src/orders/orders.service.spec.ts (7.148 s)
PASS src/orders/orders.controller.spec.ts (8.554 s)

Test Suites: 5 passed, 5 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        11.145 s
```

### 2. Frontend Automated Tests (`apps/web`)
Command: `npm --workspace=apps/web test -- src/features/orders`
```
PASS src/features/orders/orders.spec.ts
  Member 3 – Phase 6: Customer Order Management Unit Tests
    1. Currency & Date Formatting Utilities (4 tests passed)
    2. Orders API Client Integration (3 tests passed)
    3. Order Item & Snapshot Integrity (3 tests passed)
    4. Status Timeline & Lifecycle Events (2 tests passed)
    5. Pagination & Filtering Boundary Logic (2 tests passed)
    6. Merchant Order Management & Isolation Tests (4 tests passed)

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
Snapshots:   0 total
Time:        1.813 s
```

### 3. TypeScript Typecheck Verification
- Order Service: `npx tsc --noEmit -p apps/order-service/tsconfig.json` → **0 errors (Exit code 0)**
- Web App: `cd apps/web && npx tsc --noEmit` → **0 errors (Exit code 0)**

---

## 6. Manual Verification Walkthrough

To manually verify Merchant Order Management in your local browser:

### Step 1: Ensure background services are running
```powershell
# In terminal 1: Start Auth Service
npm run dev -w auth-service

# In terminal 2: Start Catalog Service
npm run dev -w catalog-service

# In terminal 3: Start Order Service (Port 3040)
npm run dev -w order-service

# In terminal 4: Start Frontend Web (Port 3000)
npm run dev -w web
```

### Step 2: Sign in as a Merchant
1. Navigate to `http://localhost:3000/login`.
2. Sign in with a merchant account (or bootstrap one using Superadmin at `http://localhost:3000/superadmin/merchants`).
3. You will be redirected to the Merchant Console at `http://localhost:3000/merchant`.

### Step 3: Access Order Management
1. In the sidebar or on the Overview page, click **Orders** (or navigate to `http://localhost:3000/merchant/orders`).
2. Observe the summary metric cards (`Total Orders`, `Pending`, `Processing`, `Shipped`, `Delivered`).
3. Filter orders using the status tabs or search for a specific Order ID.

### Step 4: Inspect Order & Apply Status Transitions
1. Click on an order card to open the order details at `http://localhost:3000/merchant/orders/[id]`.
2. Notice the **Fulfillment Management** card in the right column showing the current status and valid next actions.
3. Select `CONFIRMED` and click **Apply Status Transition**. Observe the badge update to `CONFIRMED` and the timeline record the new transition.
4. Transition to `PROCESSING` → `SHIPPED` → `DELIVERED`. When marked `DELIVERED`, the COD payment status updates to `COD_COLLECTED`.
