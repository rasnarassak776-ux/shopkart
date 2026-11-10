import { UserRole } from '@shopkart/common';

/**
 * Client-side role helpers. These only drive UX (redirects, navigation); every
 * protected API independently enforces the role server-side.
 */
export const ROLE_HOME: Record<string, string> = {
  [UserRole.CUSTOMER]: '/customer/dashboard',
  [UserRole.MERCHANT]: '/merchant/dashboard',
  [UserRole.SUPERADMIN]: '/superadmin/dashboard',
};

export const CUSTOMER_ROLES = [UserRole.CUSTOMER];
export const MERCHANT_ROLES = [UserRole.MERCHANT, UserRole.SUPERADMIN];
export const SUPERADMIN_ROLES = [UserRole.SUPERADMIN];
export const ALL_ROLES = [UserRole.CUSTOMER, UserRole.MERCHANT, UserRole.SUPERADMIN];

/** Dashboard for a verified role. Unknown roles go to the storefront, which is never guarded (no redirect loops). */
export function getRoleHomePath(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) || '/';
}

export function hasRole(role: string | null | undefined, allowed: readonly string[]): boolean {
  return Boolean(role) && allowed.includes(role as string);
}

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Route areas restricted to specific roles. Paths not listed are open to any signed-in role. */
const ROLE_AREAS: { prefix: string; roles: readonly string[] }[] = [
  { prefix: '/superadmin', roles: SUPERADMIN_ROLES },
  { prefix: '/merchant', roles: MERCHANT_ROLES },
  { prefix: '/customer', roles: CUSTOMER_ROLES },
  { prefix: '/addresses', roles: CUSTOMER_ROLES },
];

export function canRoleAccessPath(role: string | null | undefined, path: string): boolean {
  const pathname = path.split(/[?#]/)[0];
  const area = ROLE_AREAS.find((a) => matches(pathname, a.prefix));
  return area ? hasRole(role, area.roles) : true;
}

/**
 * Where to send a user right after login. A `returnUrl` is honoured only when it
 * is a same-origin relative path the verified role may access; otherwise the
 * role's dashboard is used.
 */
export function resolvePostLoginRedirect(role: string | null | undefined, returnUrl?: string | null): string {
  const isSafeRelative =
    typeof returnUrl === 'string' &&
    returnUrl.startsWith('/') &&
    !returnUrl.startsWith('//') &&
    !returnUrl.startsWith('/\\') &&
    !['/login', '/register', '/forgot-password', '/reset-password'].some((p) => matches(returnUrl.split(/[?#]/)[0], p));

  if (isSafeRelative && returnUrl !== '/' && canRoleAccessPath(role, returnUrl)) {
    return returnUrl;
  }
  return getRoleHomePath(role);
}

export function getRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case UserRole.SUPERADMIN:
      return 'Superadmin';
    case UserRole.MERCHANT:
      return 'Merchant';
    case UserRole.CUSTOMER:
      return 'Customer';
    default:
      return role || 'Unknown';
  }
}
