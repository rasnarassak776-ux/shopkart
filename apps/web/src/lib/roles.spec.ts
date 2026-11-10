import {
  ADMIN_ROLES,
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
    ['admin', '/admin/dashboard'],
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
    expect(resolvePostLoginRedirect('customer', '/admin/products')).toBe('/customer/dashboard');
    expect(resolvePostLoginRedirect('customer', '/superadmin/admins')).toBe('/customer/dashboard');
    expect(resolvePostLoginRedirect('admin', '/admin/products')).toBe('/admin/products');
    expect(resolvePostLoginRedirect('admin', '/superadmin/admins')).toBe('/admin/dashboard');
    expect(resolvePostLoginRedirect('admin', '/customer/orders')).toBe('/admin/dashboard');
    expect(resolvePostLoginRedirect('superadmin', '/superadmin/admins/create')).toBe('/superadmin/admins/create');
    expect(resolvePostLoginRedirect('superadmin', '/admin/categories')).toBe('/admin/categories');
  });

  it('never redirects off-site or back into auth pages', () => {
    for (const url of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/register?x=1', 'admin']) {
      expect(resolvePostLoginRedirect('customer', url)).toBe('/customer/dashboard');
    }
  });
});

describe('route protection rules', () => {
  it('customers cannot access admin or superadmin areas', () => {
    expect(canRoleAccessPath('customer', '/admin')).toBe(false);
    expect(canRoleAccessPath('customer', '/admin/products/1/edit')).toBe(false);
    expect(canRoleAccessPath('customer', '/superadmin/dashboard')).toBe(false);
    expect(canRoleAccessPath('customer', '/customer/cart')).toBe(true);
  });

  it('admins cannot access superadmin-only areas; superadmins inherit admin areas', () => {
    expect(canRoleAccessPath('admin', '/superadmin')).toBe(false);
    expect(canRoleAccessPath('admin', '/admin/inventory')).toBe(true);
    expect(canRoleAccessPath('superadmin', '/admin/orders')).toBe(true);
    expect(canRoleAccessPath('superadmin', '/superadmin/settings')).toBe(true);
  });

  it('does not confuse similarly named paths', () => {
    expect(canRoleAccessPath('customer', '/administrator')).toBe(true);
    expect(canRoleAccessPath('admin', '/superadmins-info')).toBe(true);
  });

  it('role lists match the agreed hierarchy', () => {
    expect(CUSTOMER_ROLES).toEqual(['customer']);
    expect(ADMIN_ROLES).toEqual(['admin', 'superadmin']);
    expect(SUPERADMIN_ROLES).toEqual(['superadmin']);
    expect(ALL_ROLES).toEqual(['customer', 'admin', 'superadmin']);
    expect(hasRole('admin', SUPERADMIN_ROLES)).toBe(false);
    expect(hasRole(undefined, ALL_ROLES)).toBe(false);
  });

  it("every role's home page is accessible to that role", () => {
    for (const role of ALL_ROLES) {
      expect(canRoleAccessPath(role, getRoleHomePath(role))).toBe(true);
    }
  });
});
