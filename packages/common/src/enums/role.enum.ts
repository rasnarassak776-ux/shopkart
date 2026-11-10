export enum UserRole {
  CUSTOMER = 'customer',
  MERCHANT = 'merchant',
  SUPERADMIN = 'superadmin',
}

/** Roles allowed to use the merchant (store management) console. */
export const MERCHANT_CONSOLE_ROLES: readonly UserRole[] = [
  UserRole.MERCHANT,
  UserRole.SUPERADMIN,
];
