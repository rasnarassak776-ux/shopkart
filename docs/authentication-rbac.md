# Shopkart – Authentication & Role-Based Access Control

Covers Customer, Admin and Superadmin authentication across `apps/auth-service`,
`apps/web` and `packages/common`.

## 1. Architecture

There is **one** authentication system for every role:

- One user table (`auth.users`), one role table (`auth.roles`).
- One login endpoint: `POST /api/v1/auth/login` (auth-service).
- One login page: `/login` (web).
- One token pipeline: a 15-minute access JWT (returned in the response body, kept
  in memory and in `sessionStorage`) and a 7-day refresh JWT. The refresh JWT is
  stored **only** in an HttpOnly cookie (`path=/api/v1/auth`, `Secure` +
  `SameSite=Strict` in production). Refresh tokens rotate on every use, are
  tracked in Redis, and reuse revokes every session for that user.

The role is never taken from the client. The backend reads it from PostgreSQL
at login and refresh, and again on **every authenticated request**: `JwtStrategy`
loads the user and rejects missing or deactivated accounts.

## 2. Roles

| Role | Can do | How the account is created |
|---|---|---|
| `customer` | Storefront, cart, checkout, own orders, profile, addresses | Public `POST /api/v1/auth/register` |
| `admin` | Store admin console: catalog (products, categories), orders | A superadmin creates it via `POST /api/v1/admins` |
| `superadmin` | Everything an admin can do, plus admin account management and the audit trail | One-time CLI bootstrap (section 4) |

The hierarchy is explicit, not implicit. Admin functionality is declared with
`@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)`. Superadmin-only routes are
declared with `@Roles(UserRole.SUPERADMIN)`.

## 3. Database

- `auth.roles` contains `customer`, `admin` and `superadmin`. The `superadmin`
  role is inserted by migration
  `20261110090000_add_superadmin_role_and_audit_logs`, which is idempotent, and
  also by `prisma/seed.ts`.
- All users live in `auth.users` and reference their role through `role_id`.
  There are no per-role tables.
- `auth.audit_logs` (new) is an append-only record of privileged actions: actor,
  action, target, metadata, IP and user agent. It has no foreign keys, so entries
  survive account changes. It never stores passwords, hashes or tokens.

Actions recorded: `superadmin.bootstrapped`, `admin.created`, `admin.updated`,
`admin.activated`, `admin.deactivated`.

## 4. Initial Superadmin provisioning

```bash
# from the repo root, against a migrated database
SUPERADMIN_EMAIL=owner@example.com \
SUPERADMIN_PASSWORD='<12+ chars, upper, lower, digit, symbol>' \
SUPERADMIN_NAME='Platform Owner' \
npm run bootstrap:superadmin -w auth-service

# compiled build / containers
npm run bootstrap:superadmin:prod -w auth-service
```

Behaviour (`apps/auth-service/src/scripts/bootstrap-superadmin.ts`):

- Credentials come only from environment variables (shell or a git-ignored
  `.env`). Nothing is hardcoded, and the password is never printed.
- The password is hashed with the same `PasswordService` used at login (bcrypt,
  cost 12).
- **Self-disabling:** if any superadmin already exists, the command does nothing
  (`Skipped: …`). It never creates a duplicate and never changes existing
  credentials. A Postgres advisory lock stops two concurrent runs from both
  creating an account.
- It refuses to promote an existing account that has the same email.
- It writes a `superadmin.bootstrapped` audit entry.
- After provisioning, remove `SUPERADMIN_PASSWORD` from the environment.

No HTTP endpoint can create, promote, demote or deactivate a superadmin. The
admin-management API is scoped to `admin` accounts only. This means the last
superadmin cannot be locked out through the API.

## 5. Login flow

1. `/login` posts `{ email, password }` to `POST /api/v1/auth/login`. Any extra
   field, such as `role`, is rejected with 400.
2. The backend checks the password. Unknown emails are compared against a dummy
   hash, so the response time and the message (`Invalid email or password.`) are
   the same as for a wrong password.
3. After the password is verified, inactive accounts are rejected with 401.
4. Tokens are issued with the role read from the database. The refresh cookie is
   set.
5. The web app redirects with `resolvePostLoginRedirect(role, returnUrl)`:
   - customer → `/customer/dashboard`
   - admin → `/admin/dashboard`
   - superadmin → `/superadmin/dashboard`

   A `returnUrl` is honoured only if it is a same-origin relative path that the
   role is allowed to visit.

Brute-force protection: 5 failed attempts per email locks that email for 15
minutes, and the login endpoint is limited to 30 requests per minute per IP.

## 6. JWT claims

Access token: `{ sub, email, role, jti, iat, exp, iss, aud }`. Refresh token:
`{ sub, jti, iat, exp, iss, aud }`. They are signed with separate secrets
(`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`).

Downstream services (catalog, cart, order) verify the signature and read the
`role` claim. The auth-service also re-checks the role and active status
against the database on every request.

## 7. Backend authorization (NestJS)

- `JwtAuthGuard` checks the signature and expiry, the access-token blacklist
  (logout), the per-user revocation timestamp (password change, reset or
  deactivation), and the user row in the database (exists, active, current
  role).
- `@Roles(...)` with `RolesGuard` returns 403 unless the database-backed
  `user.role` is in the list.
- `@RateLimit({ name, limit, windowSeconds })` with `RateLimitGuard` is a Redis
  fixed-window limit, keyed per user id or per IP for anonymous requests. It
  fails open if Redis is down.
- The global `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`, so
  `role` and `roleId` can never be injected into register, profile or admin
  DTOs.

| Endpoint | Roles |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, forgot/reset password | public |
| `GET /auth/me`, `/users/me*`, `/addresses*`, `POST /auth/logout` | any authenticated user |
| `GET /auth/admin-only`, catalog-service `/catalog/admin/*` | admin, superadmin |
| `/admins*`, `GET /audit-logs` | superadmin |

## 8. Frontend route protection

`ProtectedRoute` (`apps/web/src/components/protected-route.tsx`):

- Shows a loading state while the session is being restored.
- Sends unauthenticated users to `/login?returnUrl=…`.
- Sends signed-in users without the required role to their own dashboard. A
  role's home is never guarded against that role, so there are no redirect
  loops.

On page refresh, the cached access token is reused. The user and role, however,
are re-fetched from `GET /auth/me` (see `lib/session-restore.ts`) and are not
read from `sessionStorage`. If the cached token has expired, the refresh cookie
is used instead.

| Area | Allowed roles |
|---|---|
| `/customer/*`, `/addresses` | customer |
| `/admin/*` | admin, superadmin |
| `/superadmin/*` | superadmin |
| `/profile` | all roles |

Navigation follows the role. The account menu (`getAccountLinks`) and console
sidebar (`getConsoleNavSections`) only list destinations the role can use.
Superadmins see a "Superadmin" section above the inherited admin sections.
**Hiding UI is a convenience, not a control.** Every API enforces roles
server-side.

## 9. Admin account management (superadmin)

| Method & path | Purpose |
|---|---|
| `POST /api/v1/admins` | Create an admin (`name`, `email`, `password`, optional `phone`). The role is always `admin`. Requires a strong password (12+ characters with upper, lower, digit and symbol). Limited to 10 per minute. |
| `GET /api/v1/admins?search=&status=all\|active\|inactive&page=&limit=` | Paginated list plus `summary { total, active, inactive }` |
| `GET /api/v1/admins/:id` | Details |
| `PATCH /api/v1/admins/:id` | Update `name`, `email`, `phone` (role and password cannot be changed here) |
| `PATCH /api/v1/admins/:id/status` | `{ isActive }`. Deactivating revokes every session at once. |
| `GET /api/v1/audit-logs?limit=` | Recent privileged actions |

Every query is scoped to accounts that have the `admin` role. A customer or
superadmin id returns 404. Every mutation and its audit entry are written in
one transaction.

UI: `/superadmin/dashboard`, `/superadmin/admins`, `/superadmin/admins/create`,
`/superadmin/admins/:id`, `/superadmin/settings`.

## 10. Environment & setup

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | PostgreSQL and Redis |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | **Required in production.** Must be long, random and different from each other. The code falls back to insecure defaults for local development only. |
| `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `JWT_ISSUER`, `JWT_AUDIENCE` | Token settings |
| `FRONTEND_URL` | CORS and CSRF origin check |
| `NODE_ENV=production` | Turns on `Secure` and `SameSite=Strict` cookies |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_NAME` | Bootstrap only (section 4) |

```bash
docker compose up -d
npm run db:migrate        # or: npx prisma migrate deploy (from /database)
npm run db:seed           # roles, including superadmin, plus catalog sample data
npm run build -w @shopkart/common
SUPERADMIN_EMAIL=… SUPERADMIN_PASSWORD=… npm run bootstrap:superadmin -w auth-service
```

## 11. Testing each role

Automated tests:

```bash
npm test -w auth-service   # HTTP RBAC suite (real Nest app, guards, JWT, validation; in-memory DB), bootstrap, guards
npm test -w web            # redirects, route rules, session restore, role-aware nav, admin form
npm test -w catalog-service
```

Manual checks:

1. **Customer:** register at `/register`, then log in and land on
   `/customer/dashboard`. Visiting `/admin` or `/superadmin` sends you back to
   `/customer/dashboard`.
2. **Superadmin:** run the bootstrap, then log in and land on
   `/superadmin/dashboard`. Create an admin at `/superadmin/admins/create`.
   `/admin/products` also works.
3. **Admin:** log in with the new admin and land on `/admin/dashboard`. Visiting
   `/superadmin/*` redirects to `/admin/dashboard`. `GET /api/v1/admins` returns
   403.
4. **Deactivation:** as the superadmin, deactivate the admin. The admin's
   current tab gets 401 on its next API call, and logging in again fails.
