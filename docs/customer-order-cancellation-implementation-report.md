# Customer Order Cancellation – Implementation Report

Date: 2026-11-11

## Summary

End-to-end customer self-service order cancellation was added to ShopKart.
Customers can cancel eligible orders (PENDING, CONFIRMED, PROCESSING) from the
order list and order details pages. Cancellation is enforced server-side,
releases reserved inventory exactly once, records a pending refund for paid
orders, writes an audit history entry, and notifies the customer through the
existing notification pipeline.

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/api/v1/orders/:id/cancel` | JWT (customer) | Cancel an order owned by the caller |

Request body (`CancelOrderDto`, class-validator enforced):

```json
{ "reason": "CHANGED_MIND", "comment": "optional, max 500 chars" }
```

`reason` is a required enum: `CHANGED_MIND`, `FOUND_BETTER_PRICE`,
`DELIVERY_TOO_SLOW`, `ITEM_UNAVAILABLE`, `ORDER_PLACED_BY_MISTAKE`, `OTHER`.

Responses:
- `200` – cancelled `OrderResponse` (includes `cancellationReason`,
  `cancellationComment`, `cancelledAt`).
- `400` – order status not cancellable.
- `401/403` – unauthenticated or order owned by another customer.
- `404` – order not found.
- `409` – order already cancelled, or a concurrent transition won the race.

## Files created

- `apps/order-service/src/orders/dto/cancel-order.dto.ts` – DTO + reason enum.
- `apps/web/src/features/orders/components/cancel-order-dialog.tsx` – shared
  confirmation dialog (reason select, optional comment, error display).
- `database/prisma/migrations/20261111120000_add_customer_order_cancellation/migration.sql`
  – idempotent DDL (applied to the dev DB via `prisma db execute`).

## Files modified

- `database/prisma/schema.prisma` – `Order.cancellationReason`,
  `Order.cancellationComment`, `Order.cancelledAt`; `PaymentStatus.REFUND_PENDING`.
- `apps/order-service/src/orders/orders.controller.ts` – `PATCH :id/cancel`.
- `apps/order-service/src/orders/orders.service.ts` – `cancelOrder()` +
  response fields in `formatOrderResponse`.
- `apps/order-service/src/orders/interfaces/order-response.interface.ts`.
- `apps/order-service/src/orders/orders.service.spec.ts` – cancellation suite.
- `apps/web/src/features/orders/types.ts` – `CancellationReason`,
  `CANCELLATION_REASONS`, `CANCELLABLE_ORDER_STATUSES`, order cancellation fields,
  `REFUND_PENDING` payment status.
- `apps/web/src/features/orders/orders-api.ts` – `cancelOrder()` client.
- `apps/web/src/features/orders/components/order-details.tsx` – Cancel Order
  button (customer view only), dialog wiring, cancellation details card,
  refund-pending notice.
- `apps/web/src/features/orders/components/order-card.tsx` – Cancel Order button
  gated by `allowCancellation` (customer lists only; merchant console unaffected).
- `apps/web/src/features/orders/components/order-list.tsx` – enables cancellation
  and refreshes the card in place after success.
- `apps/web/src/features/orders/index.ts` – export dialog.
- `apps/web/src/features/orders/orders.spec.ts` – API client tests.

## Cancellation workflow

1. `OrdersService.cancelOrder(userId, orderId, dto)` loads the order with items,
   payments, and status history.
2. Ownership check: `order.userId !== userId` → `403` (merchants/other customers
   cannot cancel; merchant item ownership is untouched).
3. Status validation: `CANCELLED` → `409`; `SHIPPED`, `DELIVERED` (and any other
   non-cancellable state) → `400`. Eligible: `PENDING`, `CONFIRMED`, `PROCESSING`.
4. Single DB transaction (ReadCommitted):
   - `order.updateMany` guarded by `{ id, userId, status IN (eligible) }` —
     `count !== 1` → `409`, giving exactly-once/concurrency protection.
   - Sets `status=CANCELLED`, `cancellationReason`, `cancellationComment`,
     `cancelledAt`.
   - All `order_items.status` → `CANCELLED`.
   - `order_status_history` row with reason/comment in `notes` (audit trail).
   - `inventoryService.releaseStockInTx(tx, orderId)` releases every
     `RESERVED`/`CONFIRMED` reservation and flips it to `RELEASED`, so stock is
     restored exactly once even on retries.
   - Payments with `paymentStatus = PAID` → `REFUND_PENDING`.
5. After commit, the customer is notified via the existing
   `ORDER_STATUS_UPDATED` event (`newStatus=CANCELLED`, notes carry the reason).
   Repeated/rejected requests never reach dispatch, so no duplicate notifications.
6. The updated order is returned; the UI refreshes details/history state.

## Inventory restoration

Reuses the existing `InventoryService.releaseStockInTx`, which runs inside the
same transaction as the status change. `inventory.inventory` is updated via
conditional SQL (`available_quantity += qty`,
`reserved_quantity = GREATEST(0, reserved_quantity - qty)`) and each
`inventory_reservations` row is marked `RELEASED`. Because the release and the
status flip are atomic and reservations are only selected in
`RESERVED`/`CONFIRMED` states, stock cannot be double-restored; a concurrent
cancellation loses the `updateMany` guard and rolls back before release.

## Payment / refund handling

No payment gateway exists in the codebase (only `COD` flows are exercised;
`PaymentMethod.ONLINE`/`PaymentStatus.PAID` are schema-supported). Behaviour:

- Unpaid orders (`COD_PENDING`, `COD_COLLECTED`, `PENDING`, `FAILED`) — no refund
  action; payment rows are preserved untouched.
- Paid orders (`PAID`) — transitioned to the new `REFUND_PENDING` status,
  recording that a refund is owed but **not** marking it `REFUNDED` (refund
  completion still requires manual/automated confirmation later).
- All payment rows and history are preserved; nothing is deleted.

## Notification integration

Reuses `NotificationClient.dispatchOrderStatusUpdated` → notification-service
`ORDER_STATUS_UPDATED` event → email + in-app notification. Payload includes
`orderId`, `orderNumber`, `previousStatus`, `newStatus=CANCELLED`, and `notes`
containing the cancellation reason and customer comment. No new event type was
introduced, keeping the existing contract intact. Dispatch is fire-and-forget
after commit and failures are logged, matching existing conventions.

## Security & authorization

- Endpoint sits behind `JwtAuthGuard`; `userId` comes from the JWT (`@CurrentUser`).
- Ownership is verified in the service (`order.userId === userId`) and re-asserted
  inside the transaction's `updateMany` where-clause — frontend button visibility
  is never trusted.
- Merchant cancellation continues to flow only through
  `PATCH /orders/merchant/:id/status` with `RolesGuard` merchant/superadmin
  scoping; merchants cannot reach the customer endpoint for foreign orders.
- DTO validation (`class-validator`) on `reason`/`comment`; global
  `ValidationPipe` is already configured.

## Database migration

`20261111120000_add_customer_order_cancellation/migration.sql` (idempotent):

```sql
ALTER TABLE "orders"."orders"
  ADD COLUMN IF NOT EXISTS "cancellation_reason" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "cancellation_comment" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ(6);

ALTER TYPE "orders"."PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
```

Applied to the dev database with `npx prisma db execute`. Note: the pre-existing
broken `20261107104427_add_category_image_url` migration (P3015) was left
untouched per project notes; `prisma migrate dev` was not run.

## Test results

- `npm test -w order-service` — **50/50 pass**, including new `cancelOrder`
  suite: success + stock release + notification, paid→`REFUND_PENDING`,
  not-found, foreign-order `403`, already-cancelled `409`, `SHIPPED`/`DELIVERED`
  `400`, concurrent-transition `409`, no duplicate notification.
- `npm test -w web` — **125/125 pass**, including new `cancelOrder` API client
  tests (PATCH body, error propagation).
- `npx tsc --noEmit -p apps/order-service/tsconfig.json` — clean.
- `cd apps/web && npx tsc --noEmit` — clean.
- `npx prisma validate` — schema valid; `prisma generate` regenerated the TS
  client (query-engine DLL rename hit the known EPERM while services run; types
  were still regenerated).

## Remaining limitations

- Refunds are recorded as `REFUND_PENDING` only — there is no payment gateway
  integration, so actual refund execution is a manual/back-office step.
- Cancellation is all-or-nothing at order level (no per-item customer cancel),
  consistent with the existing aggregate status model.
- `PROCESSING` orders remain customer-cancellable per requirements; merchants
  can still cancel earlier via the console path.
