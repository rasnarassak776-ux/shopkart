import {
  adminNavSections,
  getAdminBreadcrumbs,
  getConsoleNavSections,
  superadminNavSections,
} from '@/components/admin/admin-nav';
import { getAccountLinks } from '@/components/layout/nav-links';
import { isAdminPath } from '@/components/layout/storefront-only';
import { describeAuditLog, validateAdminForm } from './admin-account-utils';
import { buildAdminsQueryString } from './superadmin-api';

const hrefs = (sections: { items: { href: string }[] }[]) => sections.flatMap((s) => s.items.map((i) => i.href));

describe('role-aware console navigation', () => {
  it('admins see only admin navigation', () => {
    const items = hrefs(getConsoleNavSections('admin'));
    expect(items).toEqual(hrefs(adminNavSections));
    expect(items.some((h) => h.startsWith('/superadmin'))).toBe(false);
  });

  it('superadmins see superadmin navigation plus inherited admin navigation', () => {
    expect(hrefs(getConsoleNavSections('superadmin'))).toEqual([...hrefs(superadminNavSections), ...hrefs(adminNavSections)]);
    expect(hrefs(superadminNavSections)).toEqual(['/superadmin/dashboard', '/superadmin/admins', '/superadmin/settings']);
  });

  it('customers and unknown roles get no console navigation', () => {
    expect(getConsoleNavSections('customer')).toEqual([]);
    expect(getConsoleNavSections(undefined)).toEqual([]);
  });

  it('account menu links are scoped to the role', () => {
    const customer = getAccountLinks('customer').map((l) => l.href);
    expect(customer.some((h) => h.startsWith('/admin') || h.startsWith('/superadmin'))).toBe(false);
    expect(customer).toContain('/customer/dashboard');

    const admin = getAccountLinks('admin').map((l) => l.href);
    expect(admin).toContain('/admin/dashboard');
    expect(admin.some((h) => h.startsWith('/superadmin'))).toBe(false);

    const superadmin = getAccountLinks('superadmin').map((l) => l.href);
    expect(superadmin).toEqual(expect.arrayContaining(['/superadmin/dashboard', '/superadmin/admins', '/admin/dashboard']));
  });

  it('treats /superadmin as console chrome and builds its breadcrumbs', () => {
    expect(isAdminPath('/superadmin/admins')).toBe(true);
    expect(isAdminPath('/superadmins')).toBe(false);
    expect(getAdminBreadcrumbs('/superadmin/dashboard')).toEqual([
      { label: 'Superadmin', href: '/superadmin/dashboard' },
      { label: 'Overview' },
    ]);
    expect(getAdminBreadcrumbs('/superadmin/admins/create')).toEqual([
      { label: 'Superadmin', href: '/superadmin/dashboard' },
      { label: 'Admin accounts', href: '/superadmin/admins' },
      { label: 'Create admin' },
    ]);
    expect(getAdminBreadcrumbs('/superadmin/admins/123').at(-1)).toEqual({ label: 'Admin details' });
  });
});

describe('admin account form validation', () => {
  const valid = { name: 'Asha', email: 'asha@shopkart.test', phone: '', password: 'Str0ng!Passw0rd', confirmPassword: 'Str0ng!Passw0rd' };

  it('accepts a valid create payload', () => {
    expect(validateAdminForm(valid, { requirePassword: true })).toEqual({});
  });

  it('requires name, valid email and a strong matching password when creating', () => {
    const errors = validateAdminForm(
      { name: ' ', email: 'bad', phone: 'x', password: 'weakpass', confirmPassword: 'other' },
      { requirePassword: true },
    );
    expect(Object.keys(errors).sort()).toEqual(['confirmPassword', 'email', 'name', 'password', 'phone']);
  });

  it('does not require a password when editing', () => {
    expect(validateAdminForm({ ...valid, password: '', confirmPassword: '' }, { requirePassword: false })).toEqual({});
  });
});

describe('superadmin API helpers', () => {
  it('builds admin list query strings', () => {
    expect(buildAdminsQueryString()).toBe('');
    expect(buildAdminsQueryString({ search: ' asha ', status: 'inactive', page: 2, limit: 20 })).toBe(
      '?search=asha&status=inactive&page=2&limit=20',
    );
    expect(buildAdminsQueryString({ status: 'all', page: 1 })).toBe('');
  });

  it('describes audit entries for the activity feed', () => {
    expect(
      describeAuditLog({
        id: '1',
        action: 'admin.deactivated',
        createdAt: '2026-11-10T00:00:00.000Z',
        metadata: null,
        actor: { id: 'a', name: 'Root' },
        target: { id: 'b', email: 'asha@shopkart.test' },
      }),
    ).toEqual({ title: 'Admin deactivated', detail: 'asha@shopkart.test · by Root' });
    expect(
      describeAuditLog({ id: '2', action: 'superadmin.bootstrapped', createdAt: '', metadata: null, actor: null, target: null }).detail,
    ).toBe('by System (CLI)');
  });
});
