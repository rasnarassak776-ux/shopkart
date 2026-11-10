export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

/** Roles allowed to use regular admin (store management) functionality. */
export const ADMIN_CONSOLE_ROLES: readonly UserRole[] = [UserRole.ADMIN, UserRole.SUPERADMIN];
