# Shopkart — Notification Service Implementation Report

**Author:** Member 4 (Notification Service & Microservices Architect)
**Date:** November 10, 2026
**Branch:** `feature/member-4-notification-service`
**Status:** Complete & Fully Verified

---

## 1. Executive Summary

Shopkart's e-commerce platform has been enhanced with a complete, dedicated **Notification Microservice** (`apps/notification-service`), delivering dual-channel communications (**Email** and **In-App Notifications**) across the entire platform lifecycle.

The Notification Service operates on port `3050` with prefix `api/v1`, fully decoupled from customer ordering and authentication processing, while providing contract-compliant point-to-point endpoints and reliable domain event dispatching.

### Key Capabilities Delivered

1. **Dual-Channel Architecture:**
   - **Email Notifications:** Implemented via Nodemailer with full SMTP configuration, connection verification on boot, error handling, message ID tracking, responsive HTML templates, and plain-text fallbacks. In development without an external SMTP server, it runs in a truthful mock mode logging safely and returning `pending` status without throwing false failures.
   - **In-App Notifications:** Persisted in PostgreSQL (`notification.notifications`), queryable by authenticated users with pagination, unread status filtering, unread counter badge, single mark-as-read, and bulk mark-all-as-read.
2. **Platform Event Catalog & Triggers:**
   - **Customer Registration (`CUSTOMER_WELCOME`):** Welcome email with shopping link + persistent in-app notification.
   - **Password Reset (`PASSWORD_RESET`):** Contract-compliant point-to-point REST endpoint dispatched by `auth-service`, generating password reset email with 15-minute expiration notice. Never stores or logs raw reset tokens or secret URLs.
   - **Order Placed (`ORDER_PLACED`):** Customer order confirmation email with itemized receipts, delivery address, and order total + in-app notification.
   - **Order Status Updated (`ORDER_STATUS_UPDATED`):** Customer alert when an order status changes (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED` or `CANCELLED`).
   - **Merchant New Order Alert (`MERCHANT_ORDER_RECEIVED`):** Dispatched to each relevant merchant with strict multi-tenant scoping: each merchant is notified **only** of the items they own and their specific financial subtotal.
   - **Order Item Shipped (`ORDER_ITEM_SHIPPED`):** Item-level dispatch notification with carrier name and tracking number.
   - **Merchant Account Created (`MERCHANT_WELCOME`):** Merchant registration confirmation and verification instructions.
   - **Merchant Account Approved (`MERCHANT_APPROVED`):** Merchant activation alert providing direct access to the Merchant Console.
3. **Security & Data Isolation:**
   - Authenticated user endpoints (`GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`) are secured via `JwtAuthGuard` and `CurrentUser` extraction. Users can never view or manipulate other users' notifications.
   - Point-to-point internal endpoints (`POST /notifications/email/password-reset`, `POST /notifications/events/dispatch`) are secured with `InternalApiKeyGuard` (`X-Internal-Api-Key` header).
4. **Cross-Service Integrations:**
   - **Auth Service:** Integrated `PasswordResetDeliveryService` (implements `INotificationDeliveryContract`), `NotificationClientService`, and triggers on user registration and merchant lifecycle.
   - **Order Service:** Integrated `NotificationClient` into `OrdersService` for order creation (customer confirmation + merchant item scoping) and status transitions (status update + shipped tracking).
5. **Next.js Frontend Storefront & Console Integration:**
   - `NotificationBell` with animated unread badge counter and popover preview panel.
   - `NotificationList` with "All" vs "Unread" filters, date formatting, mark all read, pagination, empty states, and loading skeletons.
   - Integrated into Storefront `SiteHeader`, Merchant/Superadmin `AdminHeader`, and user `AccountMenu`.
   - Full history page at `/notifications`.

---

## 2. Database Schema & Migration Details

### Migration: `20261110190000_extend_notifications`
Location: `database/prisma/migrations/20261110190000_extend_notifications/migration.sql`

```sql
-- AlterTable: extend notifications table with title, channel, recipient, read_at, error, metadata
ALTER TABLE "notification"."notifications"
  ADD COLUMN IF NOT EXISTS "title" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "channel" VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
  ADD COLUMN IF NOT EXISTS "recipient" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "error" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Performance and query indexes
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_idx"
  ON "notification"."notifications"("user_id", "read_at");

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notification"."notifications"("user_id", "created_at" DESC);
```

### Prisma Model (`database/prisma/schema.prisma`)

```prisma
enum NotificationStatus {
  PENDING
  SENT
  FAILED

  @@schema("notification")
}

model Notification {
  id        String             @id @default(uuid()) @db.Uuid
  userId    String             @map("user_id") @db.Uuid
  type      String             @db.VarChar(80)
  title     String?            @db.VarChar(200)
  message   String
  channel   String             @default("IN_APP") @db.VarChar(30)
  recipient String?            @db.VarChar(255)
  status    NotificationStatus @default(PENDING)
  readAt    DateTime?          @map("read_at") @db.Timestamptz(6)
  sentAt    DateTime?          @map("sent_at") @db.Timestamptz(6)
  error     String?
  metadata  Json?
  createdAt DateTime           @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId])
  @@index([status])
  @@index([userId, readAt])
  @@map("notifications")
  @@schema("notification")
}
```

---

## 3. Shared Contracts (`packages/common`)

Extended `packages/common/src/contracts/notification.contract.ts`:

- `INotificationDeliveryContract`: Point-to-point interface for password reset notification dispatch.
- `NotificationType` enum:
  - `CUSTOMER_WELCOME = 'CUSTOMER_WELCOME'`
  - `PASSWORD_RESET = 'PASSWORD_RESET'`
  - `ORDER_PLACED = 'ORDER_PLACED'`
  - `ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED'`
  - `MERCHANT_ORDER_RECEIVED = 'MERCHANT_ORDER_RECEIVED'`
  - `ORDER_ITEM_SHIPPED = 'ORDER_ITEM_SHIPPED'`
  - `MERCHANT_WELCOME = 'MERCHANT_WELCOME'`
  - `MERCHANT_APPROVED = 'MERCHANT_APPROVED'`
- Payload interfaces:
  - `CustomerWelcomeNotificationPayload`
  - `OrderPlacedNotificationPayload`
  - `OrderStatusUpdatedNotificationPayload`
  - `MerchantOrderReceivedNotificationPayload`
  - `OrderItemShippedNotificationPayload`
  - `MerchantWelcomeNotificationPayload`
  - `MerchantApprovedNotificationPayload`

---

## 4. Notification Service Architecture (`apps/notification-service`)

### Application Structure

```
apps/notification-service/
├── src/
│   ├── main.ts                       # Bootstrap, CORS, validation pipe, port 3050
│   ├── app.module.ts                 # Root NestJS module
│   ├── auth/
│   │   ├── auth.module.ts            # Passport & JWT integration
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts     # User authentication
│   │   │   └── internal-api-key.guard.ts # Service-to-service security
│   │   └── strategies/
│   │       └── jwt.strategy.ts       # JWT payload validation
│   ├── email/
│   │   ├── email.module.ts
│   │   ├── email.service.ts          # Nodemailer transporter & dispatch methods
│   │   └── templates/
│   │       └── email-templates.ts    # Responsive HTML + plain-text fallback templates
│   ├── notifications/
│   │   ├── dto/
│   │   │   ├── query-notifications.dto.ts
│   │   │   ├── password-reset-notification.dto.ts
│   │   │   └── dispatch-event.dto.ts
│   │   ├── notifications.controller.ts # In-app API + internal dispatch endpoints
│   │   ├── notifications.service.ts    # In-app persistence, unread counters, routing
│   │   └── notifications.module.ts
│   ├── prisma/
│   │   ├── prisma.service.ts         # Database client connection & lifecycle
│   │   └── prisma.module.ts
│   └── health/
│       ├── health.controller.ts      # GET /api/v1/health
│       └── health.module.ts
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### Endpoints Implemented

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Bearer JWT | Paginated list of notifications for authenticated user |
| `GET` | `/api/v1/notifications/unread-count` | Bearer JWT | Returns unread notification count |
| `PATCH` | `/api/v1/notifications/:id/read` | Bearer JWT | Marks single notification read (strict user scoping) |
| `PATCH` | `/api/v1/notifications/read-all` | Bearer JWT | Marks all unread notifications read for current user |
| `POST` | `/api/v1/notifications/email/password-reset` | Internal API Key | Password reset delivery (contract compliant) |
| `POST` | `/api/v1/notifications/events/dispatch` | Internal API Key | Domain event dispatcher (order, auth, merchant) |
| `GET` | `/api/v1/health` | Public | Microservice health check (DB + Email status) |

---

## 5. Frontend Storefront & Admin Console Integration

### 1. Notification Context & State Management
- Location: `apps/web/src/features/notifications/notification-context.tsx`
- Polling: Periodic silent refresh (30s interval) when authenticated.
- Immediate UI updates on marking items read.

### 2. Header Bell Icon & Popover Panel
- Location: `apps/web/src/features/notifications/components/notification-bell.tsx`
- Live badge with pulsing animation when unread count > 0.
- Popover displays top 5 recent notifications with relative time formatting ("5m ago", "2h ago"), visual unread dot, one-click mark read button, and "Mark all read" header action.
- Integrated into `SiteHeader` (storefront) and `AdminHeader` (merchant & superadmin).

### 3. Full Notifications Center Page
- Route: `/notifications` (`apps/web/src/app/(dashboard)/notifications/page.tsx`)
- Component: `apps/web/src/features/notifications/components/notification-list.tsx`
- Features: "All notifications" and "Unread" tab pills, pagination controls, skeleton loading, empty state illustrations, error retry action.

---

## 6. Verification and Test Results

### Monorepo Test Results

```
PASS  apps/notification-service/src/auth/guards/internal-api-key.guard.spec.ts
PASS  apps/notification-service/src/email/email.service.spec.ts
PASS  apps/notification-service/src/notifications/notifications.service.spec.ts
PASS  apps/notification-service/src/notifications/notifications.controller.spec.ts
Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total

PASS  apps/web/src/features/notifications/notifications.spec.ts
PASS  apps/web (all test suites)
Test Suites: 11 passed, 11 total
Tests:       123 passed, 123 total

PASS  apps/order-service (all test suites)
Test Suites: 5 passed, 5 total
Tests:       41 passed, 41 total

PASS  apps/auth-service (all test suites)
Test Suites: 3 passed, 3 total
Tests:       38 passed, 38 total

PASS  apps/catalog-service (all test suites)
Test Suites: 10 passed, 10 total
Tests:       128 passed, 128 total

PASS  apps/cart-service (all test suites)
Test Suites: 8 passed, 8 total
Tests:       61 passed, 61 total

TOTAL: 427 tests passed across all services (100% pass rate)
```

### Build & Typecheck Verification

- `npx tsc --noEmit -p apps/notification-service/tsconfig.json` — **0 errors**
- `npx tsc --noEmit -p apps/auth-service/tsconfig.json` — **0 errors**
- `npx tsc --noEmit -p apps/order-service/tsconfig.json` — **0 errors**
- `cd apps/web && npx tsc --noEmit` — **0 errors**
- `npm run build -w @shopkart/common` — **0 errors**
- `npm run build -w notification-service` — **0 errors**
- `npm run build -w auth-service` — **0 errors**
- `npm run build -w order-service` — **0 errors**
- `npm run build -w web` (Next.js production build) — **34/34 static & dynamic pages successfully generated**, including `/notifications`.
