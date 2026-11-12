# Shopkart Database ER Diagram

Source of truth: `database/prisma/schema.prisma` and `database/prisma/migrations/`.

This diagram uses one Mermaid entity per physical table. Entity names are prefixed with their PostgreSQL schema:

- `auth_*` → `auth.*`
- `catalog_*` → `catalog.*`
- `cart_*` → `cart.*`
- `orders_*` → `orders.*`
- `inventory_*` → `inventory.*`
- `notification_*` → `notification.*`

Relationship labels ending in `FK` are enforced database foreign keys. Labels ending in `logical` are cross-schema/application-level references without database foreign keys.

```mermaid
erDiagram
    %% ---------------- AUTH ----------------
    auth_roles {
        uuid id PK
        varchar(30) name UK
        timestamptz(6) created_at
    }

    auth_users {
        uuid id PK
        uuid role_id FK
        varchar(120) name
        varchar(255) email UK
        varchar(255) password_hash
        varchar(20) phone
        boolean is_active
        timestamptz(6) created_at
        timestamptz(6) updated_at
    }

    auth_addresses {
        uuid id PK
        uuid user_id FK
        varchar(120) full_name
        varchar(20) phone
        varchar(255) address_line1
        varchar(255) address_line2
        varchar(100) city
        varchar(100) state
        varchar(15) postal_code
        varchar(80) country
        boolean is_default
        timestamptz(6) created_at
    }

    auth_audit_logs {
        uuid id PK
        uuid actor_id
        varchar(60) action
        uuid target_user_id
        jsonb metadata
        varchar(64) ip_address
        varchar(255) user_agent
        timestamptz(6) created_at
    }

    %% ---------------- CATALOG ----------------
    catalog_categories {
        uuid id PK
        varchar(120) name
        varchar(140) slug UK
        text description
        uuid parent_id FK
        boolean is_active
        timestamptz(6) created_at
        timestamptz(6) updated_at
    }

    catalog_products {
        uuid id PK
        uuid category_id FK
        uuid merchant_id
        varchar(180) name
        varchar(200) slug UK
        varchar(80) sku UK
        text description
        decimal(12,2) price
        varchar(100) brand
        boolean is_active
        timestamptz(6) created_at
        timestamptz(6) updated_at
    }

    catalog_product_images {
        uuid id PK
        uuid product_id FK
        varchar(1000) image_url
        varchar(255) alt_text
        integer display_order
        boolean is_primary
        timestamptz(6) created_at
    }

    %% ---------------- CART ----------------
    cart_carts {
        uuid id PK
        uuid user_id
        cart_cartstatus status
        timestamptz(6) created_at
        timestamptz(6) updated_at
    }

    cart_cart_items {
        uuid id PK
        uuid cart_id FK
        uuid product_id
        integer quantity
        timestamptz(6) created_at
        timestamptz(6) updated_at
    }

    %% ---------------- ORDERS ----------------
    orders_orders {
        uuid id PK
        uuid user_id
        jsonb address_snapshot
        decimal(12,2) total_amount
        orders_orderstatus status
        varchar(60) cancellation_reason
        varchar(500) cancellation_comment
        timestamptz(6) cancelled_at
        timestamptz(6) created_at
        timestamptz(6) updated_at
    }

    orders_order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id
        uuid merchant_id
        varchar(180) product_name_snapshot
        integer quantity
        decimal(12,2) unit_price_snapshot
        orders_orderstatus status
        timestamptz(6) created_at
    }

    orders_payments {
        uuid id PK
        uuid order_id FK
        orders_paymentmethod payment_method
        orders_paymentstatus payment_status
        decimal(12,2) amount
        varchar(255) transaction_reference
        varchar(100) idempotency_key UK
        timestamptz(6) created_at
    }

    orders_order_status_history {
        uuid id PK
        uuid order_id FK
        uuid merchant_id
        orders_orderstatus status
        varchar(255) notes
        timestamptz(6) changed_at
    }

    %% ---------------- INVENTORY ----------------
    inventory_inventory {
        uuid id PK
        uuid product_id UK
        integer available_quantity
        integer reserved_quantity
        timestamptz(6) updated_at
    }

    inventory_inventory_reservations {
        uuid id PK
        uuid order_id
        uuid product_id
        integer quantity
        inventory_reservationstatus status
        timestamptz(6) expires_at
        timestamptz(6) created_at
    }

    %% ---------------- NOTIFICATION ----------------
    notification_notifications {
        uuid id PK
        uuid user_id
        varchar(80) type
        varchar(200) title
        text message
        varchar(30) channel
        varchar(255) recipient
        notification_notificationstatus status
        timestamptz(6) read_at
        timestamptz(6) sent_at
        text error
        jsonb metadata
        timestamptz(6) created_at
    }

    %% ---------------- ENFORCED FOREIGN KEYS ----------------
    auth_roles ||--o{ auth_users : role_id FK
    auth_users ||--o{ auth_addresses : user_id FK

    catalog_categories ||--o{ catalog_categories : parent_id FK
    catalog_categories ||--o{ catalog_products : category_id FK
    catalog_products ||--o{ catalog_product_images : product_id FK

    cart_carts ||--o{ cart_cart_items : cart_id FK

    orders_orders ||--o{ orders_order_items : order_id FK
    orders_orders ||--o{ orders_payments : order_id FK
    orders_orders ||--o{ orders_order_status_history : order_id FK

    %% ---------------- LOGICAL CROSS-SCHEMA REFERENCES ----------------
    auth_users |o--o{ auth_audit_logs : actor_id logical
    auth_users |o--o{ auth_audit_logs : target_user_id logical

    auth_users ||--o{ cart_carts : user_id logical
    catalog_products ||--o{ cart_cart_items : product_id logical

    auth_users |o--o{ catalog_products : merchant_id logical

    auth_users ||--o{ orders_orders : user_id logical
    catalog_products ||--o{ orders_order_items : product_id logical
    auth_users |o--o{ orders_order_items : merchant_id logical
    auth_users |o--o{ orders_order_status_history : merchant_id logical

    catalog_products |o--o| inventory_inventory : product_id logical
    catalog_products ||--o{ inventory_inventory_reservations : product_id logical
    orders_orders ||--o{ inventory_inventory_reservations : order_id logical

    auth_users ||--o{ notification_notifications : user_id logical
```

## PostgreSQL enum types

| Enum | Values |
|---|---|
| `cart."CartStatus"` | `ACTIVE`, `CONVERTED`, `ABANDONED` |
| `orders."OrderStatus"` | `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| `orders."PaymentMethod"` | `ONLINE`, `COD` |
| `orders."PaymentStatus"` | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `REFUNDED`, `REFUND_PENDING`, `COD_PENDING`, `COD_COLLECTED` |
| `inventory."ReservationStatus"` | `RESERVED`, `CONFIRMED`, `RELEASED`, `EXPIRED` |
| `notification."NotificationStatus"` | `PENDING`, `SENT`, `FAILED` |

## Application-level vocabularies

These fields are `VARCHAR`/`TEXT`, not PostgreSQL enums:

- `auth.roles.name`: `customer`, `merchant`, `superadmin`
- `notification.notifications.type`: `CUSTOMER_WELCOME`, `PASSWORD_RESET`, `ORDER_PLACED`, `ORDER_STATUS_UPDATED`, `MERCHANT_ORDER_RECEIVED`, `ORDER_ITEM_SHIPPED`, `MERCHANT_WELCOME`, `MERCHANT_APPROVED`
- `notification.notifications.channel`: `IN_APP`, `EMAIL`
- `orders.orders.cancellation_reason`: `CHANGED_MIND`, `FOUND_BETTER_PRICE`, `DELIVERY_TOO_SLOW`, `ITEM_UNAVAILABLE`, `ORDER_PLACED_BY_MISTAKE`, `OTHER`

## Constraints not fully represented by Mermaid

- `cart.cart_items` has unique `(cart_id, product_id)`.
- `orders.payments.idempotency_key` is unique.
- `inventory.inventory.product_id` is unique.
- `catalog.categories.slug`, `catalog.products.slug`, `catalog.products.sku`, `auth.roles.name`, and `auth.users.email` are unique.
- `notification.notifications` has indexes on `user_id`, `status`, `(user_id, read_at)`, and `(user_id, created_at DESC)`.
- Several business rules are application-enforced: one default address per user, valid category trees, order-status transitions, merchant ownership checks, and inventory reservation lifecycle.
