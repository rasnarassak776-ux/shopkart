# Member 3 – Phase 3 Frontend Integration Contract
## Shopping Cart API & Frontend Implementation Guide

This document defines the interface contract, behavior specifications, and integration guidelines for Member 3's Phase 3 Frontend Cart Implementation in `apps/web`.

---

## 1. Cart API Base URL & Network Configuration

- **Development Base URL**: `http://localhost:3030/api/v1`
- **Environment Variable (`apps/web/.env.local`)**:
  ```env
  NEXT_PUBLIC_CART_API_URL=http://localhost:3030
  ```
- **CORS Configuration**:
  - `apps/cart-service` allows Origin: `http://localhost:3000`
  - `credentials: true` (supports cookie forwarding if needed)
  - Allowed Headers: `Content-Type`, `Authorization`, `X-Requested-With`, `Accept`
  - Exposed Headers: `Content-Range`, `X-Content-Range`

---

## 2. API Endpoints Specification

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/cart` | Retrieve the authenticated user's active shopping cart | Yes (Bearer JWT) |
| `POST` | `/api/v1/cart/items` | Add a product to the cart or increment quantity if already present | Yes (Bearer JWT) |
| `PATCH` | `/api/v1/cart/items/:itemId` | Update quantity of a specific item in the cart (absolute set) | Yes (Bearer JWT) |
| `DELETE` | `/api/v1/cart/items/:itemId` | Remove a specific item from the cart | Yes (Bearer JWT) |
| `DELETE` | `/api/v1/cart/items` | Clear all items from the active cart | Yes (Bearer JWT) |

---

## 3. Authentication & Security Requirements

1. **JWT Header**: All cart routes require a verified JWT access token in the `Authorization` header:
   ```http
   Authorization: Bearer <access_token>
   ```
2. **Identity Extraction**: The backend extracts user identity strictly from the verified JWT payload `sub` claim. No customer ID or user ID is accepted via request URL params or body.
3. **Algorithm & Validation**: Cart Service validates access tokens signed with `JWT_ACCESS_SECRET` using algorithm `HS256`, verifying issuer (`shopkart-auth-service`), audience (`shopkart-client`), and expiration.
4. **Token Expiration & Refresh**:
   - Access tokens expire after 15 minutes.
   - Frontend must automatically refresh tokens using Auth Service (`POST http://localhost:3001/api/v1/auth/refresh`) using the HTTP-only refresh token cookie and retry failed requests.

---

## 4. Request DTOs & Payloads

### 4.1 Add Item (`POST /api/v1/cart/items`)

**TypeScript Interface**:
```typescript
export interface AddToCartDto {
  productId: string; // Valid UUID or Catalog product ID
  quantity: number;  // Integer between 1 and 99
}
```

**JSON Example**:
```json
{
  "productId": "e3b0c442-98fc-1c14-9afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "quantity": 2
}
```

### 4.2 Update Item Quantity (`PATCH /api/v1/cart/items/:itemId`)

**Path Parameter**: `:itemId` – ID of the `CartItem` to update.

**TypeScript Interface**:
```typescript
export interface UpdateCartItemDto {
  quantity: number; // Integer between 1 and 99
}
```

**JSON Example**:
```json
{
  "quantity": 5
}
```

---

## 5. Response Formats & Contracts

### 5.1 TypeScript Response Interfaces (`apps/web/src/features/cart/types.ts`)

```typescript
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: string; // Two decimal places, e.g. "299.99"
  quantity: number;
  lineTotal: string; // Two decimal places, e.g. "599.98"
  available: boolean; // false if product was deleted or inactivated in Catalog
}

export interface CartSummary {
  totalItems: number;     // Total quantity of all items in cart (for cart icon badge)
  availableItems: number; // Total quantity of purchasable active items
  subtotal: string;       // Sum of lineTotal for available items only, e.g. "599.98"
}

export interface Cart {
  cartId: string | null;
  items: CartItem[];
  summary: CartSummary;
}
```

### 5.2 Populated Cart Response (with Active & Inactive Items)

```json
{
  "cartId": "c1f7a834-8021-4f76-bc3e-001122334455",
  "items": [
    {
      "id": "item-uuid-1",
      "productId": "prod-uuid-1",
      "name": "Wireless Noise Cancelling Headphones",
      "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
      "unitPrice": "299.99",
      "quantity": 2,
      "lineTotal": "599.98",
      "available": true
    },
    {
      "id": "item-uuid-2",
      "productId": "prod-uuid-2",
      "name": "Discontinued Keyboard",
      "imageUrl": null,
      "unitPrice": "0.00",
      "quantity": 1,
      "lineTotal": "0.00",
      "available": false
    }
  ],
  "summary": {
    "totalItems": 3,
    "availableItems": 2,
    "subtotal": "599.98"
  }
}
```

### 5.3 Empty Cart Response (`GET /api/v1/cart` or after `clearCart`)

When a user has no active cart or has cleared all items:
```json
{
  "cartId": null,
  "items": [],
  "summary": {
    "totalItems": 0,
    "availableItems": 0,
    "subtotal": "0.00"
  }
}
```

---

## 6. HTTP Error Status Codes & Response Bodies

Standard NestJS error structure:
```json
{
  "statusCode": 400,
  "message": "Quantity cannot be less than 1",
  "error": "Bad Request"
}
```

| Code | Trigger | Frontend Action |
|---|---|---|
| `400 Bad Request` | Validation failure (e.g., `quantity > 99`, invalid UUID, or adding quantity that would push cart total for product > 99) | Display inline error banner or toast with backend message |
| `401 Unauthorized` | Missing, malformed, or expired token | Automatically trigger `apiClient` token refresh or redirect to `/login?redirect=/cart` |
| `404 Not Found` | Product ID not found in Catalog, or item ID does not exist in user's active cart | Display warning: "Item not found or already removed", trigger cart refresh |
| `503 Service Unavailable` | Catalog Service is unreachable during live product resolution | Show user notification: "Unable to verify product details. Please try again shortly." |

---

## 7. Frontend Empty Cart Handling

- If `cart.items.length === 0`:
  - Render empty cart placeholder: friendly illustration, "Your cart is empty" message, and a primary CTA "Browse Products" linking to `/products`.
  - Disable or hide the "Proceed to Checkout" button.
  - Cart counter badge in header should display `0` or remain hidden.

---

## 8. Frontend Unavailable Product Handling

When a product previously added to the cart is deactivated (`isActive: false`) or deleted in the Catalog Service:
1. `item.available` is `false`.
2. `item.unitPrice` and `item.lineTotal` are formatted as `"0.00"`.
3. The item is **excluded** from `summary.subtotal` and `summary.availableItems`.
4. **UI Guidance**:
   - Render a distinct warning tag or alert banner on the item row: *"This item is currently unavailable or out of catalog."*
   - Highlight the "Remove" button so the user can discard it.
   - Disable the "Proceed to Checkout" button or display a blocking notice: *"Please remove unavailable items from your cart before proceeding to checkout."*

---

## 9. Quantity Constraints & Controls

- **Minimum Quantity**: `1`
- **Maximum Quantity**: `99`
- **Controls**:
  - Decrement button (`-`): Disabled when `quantity <= 1`. Clicking remove or a trash icon should prompt or trigger `DELETE /api/v1/cart/items/:itemId`.
  - Increment button (`+`): Disabled when `quantity >= 99`.
  - Direct Input: Validate input on blur or change (`Math.min(99, Math.max(1, parsedVal))`).

---

## 10. Subtotal & Currency Formatting

- The backend performs all monetary calculations using exact decimal arithmetic (`Big.js` / string decimals) to prevent binary floating-point rounding issues (e.g., `0.1 + 0.2 = 0.30000000000000004`).
- Frontend should display `summary.subtotal` directly formatted with currency symbol: `$` + `summary.subtotal` (e.g., `$599.98`).
- Do not perform client-side re-calculation of the subtotal; always bind directly to `cart.summary.subtotal`.

---

## 11. Recommended Frontend API Client Reuse

Member 1 established [`apps/web/src/lib/api-client.ts`](file:///c:/Users/hp/Projects/shopkart/apps/web/src/lib/api-client.ts), which provides:
- Automatic Bearer token injection from `inMemoryAccessToken`.
- Anti-CSRF header `X-Requested-With: XMLHttpRequest`.
- Transparent 401 handling with request queueing and token refresh via `/api/v1/auth/refresh`.

**Integration pattern in `apps/web/src/features/cart/cart-api.ts`**:
```typescript
import { apiClient } from '@/lib/api-client';
import { Cart, AddToCartDto, UpdateCartItemDto } from './types';

const CART_API_URL = process.env.NEXT_PUBLIC_CART_API_URL || 'http://localhost:3030';

export async function getCart(): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart`);
}

export async function addToCart(dto: AddToCartDto): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart/items`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateCartItemQuantity(itemId: string, dto: UpdateCartItemDto): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function clearCart(): Promise<Cart> {
  return apiClient<Cart>(`${CART_API_URL}/api/v1/cart/items`, {
    method: 'DELETE',
  });
}
```

---

## 12. Recommended Cart State Management

- Implement a React Context (`CartProvider` / `useCart`) inside `apps/web/src/features/cart/context/cart-context.tsx`.
- Load the cart upon authentication state initialization.
- Provide optimistic updates for quantity changes with automatic rollback on error.
- Expose helper states:
  - `cart`: `Cart | null`
  - `isLoading`: `boolean`
  - `isUpdating`: `boolean`
  - `cartItemCount`: `number` (maps to `summary.totalItems` for badge)
  - `hasUnavailableItems`: `boolean` (`cart.items.some(i => !i.available)`)

---

## 13. Known Limitations & Edge Cases

1. **Token Revocation Window**:
   - Access tokens are stateless JWTs with a 15-minute TTL. While Member 1's Auth Service records logout/revocation in Redis, Cart Service validates access token signatures and expiration directly. In Phase 3, this creates a maximum 15-minute window for revoked tokens unless Redis blacklist checks are introduced.
2. **Catalog Product Price Changes**:
   - Cart prices reflect current Catalog pricing resolved live on each `GET /api/v1/cart` or cart modification. When checking out (Phase 4), final order item prices are snapshotted into the `OrderItem` database record.
3. **Database Concurrency Protection**:
   - Cart item modifications are protected by PostgreSQL transactional advisory locks (`pg_advisory_xact_lock(hashtext('cart_' || userId))`). Multiple concurrent requests from the same user (e.g., rapid double-clicks) will execute sequentially rather than conflicting.
