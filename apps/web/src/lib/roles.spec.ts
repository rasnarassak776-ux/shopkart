import {
  MERCHANT_ROLES,
  ALL_ROLES,
  CUSTOMER_ROLES,
  SUPERADMIN_ROLES,
  canRoleAccessPath,
  getRoleHomePath,
  hasRole,
  resolvePostLoginRedirect,
} from './roles';

describe('role-based redirects after login', () => {
  it.each([
    ['customer', '/customer/dashboard'],
    ['merchant', '/merchant/dashboard'],
    ['superadmin', '/superadmin/dashboard'],
  ])('%s is sent to %s', (role, home) => {
    expect(resolvePostLoginRedirect(role, null)).toBe(home);
    expect(getRoleHomePath(role)).toBe(home);
  });

  it('sends unknown or missing roles to the unguarded storefront (no redirect loop)', () => {
    expect(getRoleHomePath('auditor')).toBe('/');
    expect(getRoleHomePath(undefined)).toBe('/');
    expect(canRoleAccessPath('auditor', '/')).toBe(true);
  });

  it('honours a returnUrl only when the role may access it', () => {
    expect(resolvePostLoginRedirect('customer', '/checkout')).toBe('/checkout');
    expect(resolvePostLoginRedirect('customer', '/merchant/products')).toBe('/customer/dashboard');
    expect(resolvePostLoginRedirect('customer', '/superadmin/merchants')).toBe('/customer/dashboard');
    expect(resolvePostLoginRedirect('merchant', '/merchant/products')).toBe('/merchant/products');
    expect(resolvePostLoginRedirect('merchant', '/superadmin/merchants')).toBe('/merchant/dashboard');
    expect(resolvePostLoginRedirect('merchant', '/customer/orders')).toBe('/merchant/dashboard');
    expect(resolvePostLoginRedirect('superadmin', '/superadmin/merchants/create')).toBe('/superadmin/merchants/create');
    expect(resolvePostLoginRedirect('superadmin', '/merchant/categories')).toBe('/merchant/categories');
  });

  it('never redirects off-site or back into auth pages', () => {
    for (const url of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/register?x=1', 'merchant']) {
      expect(resolvePostLoginRedirect('customer', url)).toBe('/customer/dashboard');
    }
  });
});

describe('route protection rules', () => {
  it('customers cannot access merchant or superadmin areas', () => {
    expect(canRoleAccessPath('customer', '/merchant')).toBe(false);
    expect(canRoleAccessPath('customer', '/merchant/products/1/edit')).toBe(false);
    expect(canRoleAccessPath('customer', '/superadmin/dashboard')).toBe(false);
    expect(canRoleAccessPath('customer', '/customer/cart')).toBe(true);
  });

  it('merchants cannot access superadmin-only areas; superadmins inherit merchant areas', () => {
    expect(canRoleAccessPath('merchant', '/superadmin')).toBe(false);
    expect(canRoleAccessPath('merchant', '/merchant/inventory')).toBe(true);
    expect(canRoleAccessPath('superadmin', '/merchant/orders')).toBe(true);
    expect(canRoleAccessPath('superadmin', '/superadmin/settings')).toBe(true);
  });

  it('does not confuse similarly named paths', () => {
    expect(canRoleAccessPath('customer', '/administrator')).toBe(true);
    expect(canRoleAccessPath('merchant', '/superadmins-info')).toBe(true);
  });

  it('role lists match the agreed hierarchy', () => {
    expect(CUSTOMER_ROLES).toEqual(['customer']);
    expect(MERCHANT_ROLES).toEqual(['merchant', 'superadmin']);
    expect(SUPERADMIN_ROLES).toEqual(['superadmin']);
    expect(ALL_ROLES).toEqual(['customer', 'merchant', 'superadmin']);
    expect(hasRole('merchant', SUPERADMIN_ROLES)).toBe(false);
    expect(hasRole(undefined, ALL_ROLES)).toBe(false);
  });

  it("every role's home page is accessible to that role", () => {
    for (const role of ALL_ROLES) {
      expect(canRoleAccessPath(role, getRoleHomePath(role))).toBe(true);
    }
  });
});
