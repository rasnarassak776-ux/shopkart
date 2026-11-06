# @shopkart/common

Shared types, contracts, enums, and interfaces for the Shopkart e-commerce microservices platform.

## Purpose

This package provides a single source of truth for:
1. Canonical user roles (`customer`, `admin`).
2. Standard JWT payload structure issued by the Auth microservice.
3. Canonical Address Snapshot structure embedded into orders by Member 3.
4. Shared Auth Guard and Role Guard contracts for downstream microservices (Catalog, Orders, Inventory, Notifications).

## Exports

- `UserRole`: Enum containing `'customer'` and `'admin'`
- `JwtPayload`: Interface defining token claims (`sub`, `email`, `role`)
- `AddressSnapshot`: Interface defining the frozen order address format
- `AuthenticatedUser`: Request user interface
- `ROLES_KEY`, `IAuthGuardContract`, `IRolesGuardContract`: Guard contract tokens

## Dependency Relationships

- **Depended on by**:
  - `apps/auth-service`: Uses `UserRole`, `JwtPayload`, `AddressSnapshot`
  - `apps/web`: Uses `UserRole`, `JwtPayload`
  - Downstream microservices (Member 2 Catalog, Member 3 Orders, Member 4 Notifications) can depend on `@shopkart/common` to decode tokens and enforce role checks without duplicating definitions.
- **Dependencies**: None (pure TypeScript definitions, 0 runtime overhead).
