# Razorpay Test Mode Payment Gateway — Integration Report

Date: 2026-11-13
Scope: Shopkart multi-vendor storefront — online payments (Razorpay Standard
Checkout, TEST MODE) alongside the existing Cash on Delivery (COD) flow.

---

## 1. Architecture & payment flow

```
Customer (Next.js checkout)
   │  POST /api/v1/payments/razorpay/create-order  {addressId} + Idempotency-Key
   ▼
order-service PaymentsController (JWT)
   │  PaymentsService.createRazorpayOrder()
   │    ├─ OrdersService.createOrder(paymentMethod='ONLINE')
   │    │     └─ existing pipeline: address snapshot → cart → catalog price
   │    │        revalidation → Order + OrderItems (merchantId snapshot) +
   │    │        Payment(ONLINE/PENDING) + inventory reservation (1 tx)
   │    └─ RazorpayService.createOrder(amount_paise, receipt=orderId)
   │          → stores razorpay_order_id on the Payment row
   ▼
Response: { orderId, paymentId, razorpayOrderId, amount(paise), currency,
            keyId, prefill{name,email,contact} }
   │
   ▼
Browser opens Razorpay Checkout.js (public key_id only — secrets stay server-side)
   │  customer pays (UPI / card / netbanking in test mode)
   ▼
POST /api/v1/payments/razorpay/verify {orderId, razorpayOrderId,
     razorpayPaymentId, razorpaySignature}
   │  PaymentsService.verifyPayment()
   │    1. order ownership check (userId)
   │    2. razorpayOrderId must match the stored value on the payment row
   │    3. HMAC-SHA256(order_id|payment_id, KEY_SECRET) signature check
   │    4. payments.fetch() → status must be 'captured', amount & currency
   │       must equal the server-side record
   │    5. markPaymentCaptured(): PENDING/FAILED → PAID, order PENDING →
   │       CONFIRMED; CANCELLED order → REFUND_PENDING (never revived)
   ▼
Razorpay webhook (independent confirmation channel)
   POST /api/v1/payments/razorpay/webhook
   │  signature verified over the RAW body with RAZORPAY_WEBHOOK_SECRET
   │  events: payment.captured / payment.failed / order.paid
   │  idempotent, never regresses terminal states
```

COD path is unchanged: `POST /api/v1/orders` with `paymentMethod: 'COD'`
creates the same COD_PENDING payment as before.

## 2. Files created

Backend (`apps/order-service/src/`):

- `payments/payments.module.ts` — Nest module (imports AuthModule, OrdersModule)
- `payments/payments.controller.ts` — `POST payments/razorpay/create-order`,
  `POST payments/razorpay/verify`, `POST payments/razorpay/webhook` (public,
  signature-authenticated via `@Public()`)
- `payments/payments.service.ts` — order/retry orchestration, signature +
  Razorpay-API verification, webhook handling, shared captured/failed
  transitions (`markPaymentCaptured`, `markPaymentFailed`)
- `payments/razorpay.service.ts` — SDK wrapper, env validation, HMAC helpers
- `payments/dto/payments.dto.ts` — class-validator DTOs
- `payments/payments.service.spec.ts` — 20 unit tests

Frontend (`apps/web/src/`):

- `features/checkout/razorpay-checkout.ts` — checkout.js loader + promise
  wrapper (dismiss vs success distinction)
- `docs/razorpay-test-mode-integration-report.md` — this file

Database:

- `database/prisma/migrations/20261113090000_add_razorpay_payment_fields/migration.sql`

## 3. Files modified

Backend:

- `database/prisma/schema.prisma` — `Payment` model extended
- `apps/order-service/src/orders/dto/create-order.dto.ts` — `paymentMethod`
  now accepts `'COD' | 'ONLINE'`
- `apps/order-service/src/orders/orders.service.ts` — ONLINE orders create a
  `PaymentMethod.ONLINE`/`PENDING` record; `formatOrderResponse` exposes
  Razorpay references only to the owning customer / superadmin
  (`merchantView` strips them)
- `apps/order-service/src/orders/interfaces/order-response.interface.ts` —
  payment response fields
- `apps/order-service/src/app.module.ts`, `src/main.ts` — PaymentsModule
  registered; `rawBody: true` for webhook signature verification
- `apps/order-service/package.json` — `razorpay@2.9.6` dependency
- `.env`, `.env.example` — Razorpay env vars

Frontend:

- `features/checkout/types.ts` — `RazorpayOrderSession`,
  `VerifyRazorpayPayment*` types
- `features/checkout/checkout-api.ts` — `createRazorpayOrder`,
  `verifyRazorpayPayment`
- `features/checkout/checkout-context.tsx` — ONLINE option enabled
  ("Pay Online (Razorpay)")
- `features/checkout/components/checkout-order-review.tsx` — ONLINE flow:
  create-order → open Checkout → verify → confirmation; COD untouched
- `features/checkout/checkout.spec.ts` — updated availability assertion
- `features/orders/types.ts` — `Payment` extended with gateway fields
- `features/orders/components/order-details.tsx` — Razorpay refs, failure
  reason, **Retry Online Payment** for customers
- `features/orders/components/order-confirmation.tsx` — dynamic COD/Razorpay
  method & status display

## 4. Database changes

Migration: `20261113090000_add_razorpay_payment_fields` (idempotent SQL,
applied via `prisma db execute` per project convention — `migrate dev` is
blocked by the pre-existing `20261107104427_add_category_image_url` drift
folder, see AGENTS.md).

`orders.payments` new columns (all nullable/defaulted — COD rows untouched):

| Column | Type | Purpose |
|---|---|---|
| `currency` | varchar(10) default 'INR' | payment currency |
| `razorpay_order_id` | varchar(255), UNIQUE | gateway order id (idempotent replay key) |
| `razorpay_payment_id` | varchar(255), indexed | gateway payment id |
| `payment_verified_at` | timestamptz | verification timestamp |
| `failure_reason` | varchar(500) | failure detail from gateway |
| `updated_at` | timestamptz | row tracking |

No new tables, no enum changes, no data deleted.

## 5. API endpoints

All under the order-service global prefix `/api/v1`:

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /payments/razorpay/create-order` | JWT (customer) | Body `{addressId}` (new order) or `{orderId}` (retry). `Idempotency-Key` header required for new orders. Returns `{orderId, paymentId, razorpayOrderId, amount, amountInr, currency, keyId, prefill}` |
| `POST /payments/razorpay/verify` | JWT (customer) | Body `{orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature}` → `{paymentStatus, orderStatus, ...}` |
| `POST /payments/razorpay/webhook` | Razorpay signature | Raw-body HMAC verified; handles `payment.captured`, `payment.failed`, `order.paid` |
| `POST /orders` | JWT | unchanged; `paymentMethod` now also accepts `ONLINE` |

## 6. Environment variables

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx
```

- Backend-only (order-service). `key_id` is also returned to the browser —
  that is the public key and is safe to expose.
- `key_secret` and `webhook_secret` never leave the server.
- On boot the service logs a clear error listing missing vars; requests to
  the payment endpoints fail with an explanatory message while COD keeps
  working. Non-`rzp_test_` keys are rejected (test mode only).

## 7. Razorpay Dashboard configuration

1. Sign in to the Razorpay Dashboard → switch to **Test Mode**.
2. Settings → API Keys → generate a **Test** Key ID/Secret → set
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. Settings → Webhooks → Add webhook:
   - URL: `https://<your-public-host>/api/v1/payments/razorpay/webhook`
     (for local dev use a tunnel, e.g. `ngrok http 3040`, and point the URL
     at `https://<tunnel>/api/v1/payments/razorpay/webhook`)
   - Secret: any strong random string → `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`, `order.paid`
4. Enable payment methods you want to exercise (UPI, cards, netbanking) —
   all work in test mode with Razorpay's test credentials.

## 8. Security implementation

- JWT auth on customer endpoints; webhook is `@Public()` but requires a
  valid `x-razorpay-signature` HMAC over the **raw** request body
  (`rawBody: true` in `main.ts`).
- Server-side amount: total is recomputed from catalog prices inside the
  existing order pipeline; the client never submits an amount.
- Verification uses the **stored** `razorpay_order_id`, checks ownership,
  verifies the checkout signature (HMAC-SHA256, timing-safe compare), then
  confirms `status='captured'`, amount (paise) and `currency=INR` via
  `payments.fetch()`.
- Idempotency: `Idempotency-Key` on order creation; `razorpay_order_id`
  unique constraint; terminal-state guards make verify/webhook replays
  no-ops; `updateMany` with status predicates prevents races.
- State machine: `PENDING/PROCESSING/FAILED → PAID`; `PAID` is terminal —
  delayed `payment.failed`/duplicate webhooks cannot regress it. A capture
  arriving after customer cancellation yields `REFUND_PENDING` (manual
  reconciliation; the cancelled order is never revived).
- Merchants never receive `razorpay_*` fields (`merchantView` strips them);
  superadmin sees full payment info via the existing console endpoints.
- Input validation via class-validator DTOs; global `ValidationPipe`.

## 9. Test cases & results

`apps/order-service/src/payments/payments.service.spec.ts` — 20 tests, all
passing (`npx jest` in `apps/order-service`: **70/70 pass**; `apps/web`:
**125/125 pass**):

- create-order success path, unconfigured gateway, missing params,
  idempotent Razorpay-order reuse, cross-customer retry → 403,
  cancelled-order retry → 400
- verify: success → PAID + order CONFIRMED; bad signature → 400;
  foreign razorpayOrderId → 400; other customer's order → 403;
  duplicate verify idempotent; amount mismatch → 400; non-captured → 400;
  cancelled order → REFUND_PENDING (order stays CANCELLED)
- webhook: bad signature → 401; `payment.captured` processed; delayed
  duplicate doesn't regress PAID; `payment.failed` recorded; PAID never
  marked FAILED; `order.paid` resolved via order-payments lookup

`COD` regression: existing `orders.service.spec.ts` (COD placement,
idempotency, cancellation) all pass unchanged.

## 10. Local testing instructions

1. `npm install` (already adds `razorpay` to order-service).
2. Put test credentials in `.env` (`RAZORPAY_*`).
3. Apply the migration once against the dev DB:
   `npx prisma db execute --file database/prisma/migrations/20261113090000_add_razorpay_payment_fields/migration.sql --schema database/prisma/schema.prisma`
4. `npx prisma generate --schema database/prisma/schema.prisma`
   (the query-engine DLL rename may EPERM while services run — the TS
   client still regenerates; restart services afterwards).
5. Restart order-service; confirm log: `Razorpay client initialized in TEST MODE`.
6. For webhook testing, expose port 3040 (e.g. `ngrok http 3040`) and
   register the webhook URL in the Razorpay dashboard.

## 11. Testing successful & failed transactions (Razorpay Test Mode)

- **Success**: checkout → select *Pay Online (Razorpay)* → Pay Now → in the
  Razorpay modal pick UPI → use `success@razorpay` (or any UPI) → enter the
  test OTP/approve → payment verifies → confirmation page shows
  "Paid Successfully". Order moves PENDING → CONFIRMED.
- **Failure**: in the modal choose a card and use a decline card
  (e.g. `4000 0000 0000 0002`) → payment fails → order details shows
  FAILED + reason and a **Retry Online Payment** button (safe retry, no
  duplicate order).
- **Cancel**: close the Razorpay modal → order is saved unpaid; retry from
  order details.
- **Webhook check**: Razorpay dashboard → Webhooks → recent deliveries
  should show 200s for `payment.captured` / `payment.failed`.

## 12. Known limitations

- Payment capture is platform-level: one Razorpay order covers the whole
  multi-merchant cart; there are no per-merchant splits or Route transfers
  (out of scope by design).
- No automated refunds: cancelled paid orders become `REFUND_PENDING` for
  manual reconciliation in the Razorpay dashboard.
- Abandoned checkouts keep the order + reserved stock until cancelled
  manually (same lifecycle as COD orders today).
- `prisma migrate dev/deploy` remains blocked by the pre-existing
  `20261107104427_add_category_image_url` drift folder — apply SQL with
  `prisma db execute` as documented in AGENTS.md.
- Live mode is intentionally rejected: only `rzp_test_*` keys are accepted.

## 13. Steps required before enabling Live Mode

1. Re-run the full payment test matrix against Razorpay **Live** keys in a
   staging environment.
2. Replace test keys with live `rzp_live_*` credentials and update the
   key-prefix check in `RazorpayService.onModuleInit`.
3. Re-register the webhook URL/secret for the production domain.
4. Implement/verify the refund workflow for `REFUND_PENDING` payments
   before go-live.
5. Review rate limiting/WAF on the webhook endpoint for production traffic.
