import { adminNavSections, getAdminBreadcrumbs, isNavItemActive } from '@/components/admin/admin-nav';
import { isAdminPath } from '@/components/layout/storefront-only';
import { filterCategories, getDescendantIds, slugify } from './category-utils';
import type { AdminCategory } from './types';

const category = (id: string, name: string, parentId: string | null, isActive = true): AdminCategory => ({
  id,
  name,
  slug: slugify(name),
  description: null,
  parentId,
  isActive,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  parent: null,
  _count: { products: 0, children: 0 },
});

describe('admin navigation', () => {
  const items = adminNavSections.flatMap((s) => s.items);
  const item = (label: string) => items.find((i) => i.label === label)!;

  it('exposes the required sections', () => {
    expect(items.map((i) => i.label)).toEqual([
      'Overview',
      'Products',
      'Categories',
      'Orders',
      'Inventory',
      'Customers',
      'Settings',
    ]);
  });

  it('marks modules owned by other services as coming soon', () => {
    for (const label of ['Orders', 'Inventory', 'Customers']) {
      expect(item(label).availability).toBe('coming-soon');
    }
    expect(item('Products').availability).toBe('available');
    expect(item('Categories').availability).toBe('available');
  });

  it('matches overview exactly and sections by prefix', () => {
    expect(isNavItemActive(item('Overview'), '/admin')).toBe(true);
    expect(isNavItemActive(item('Overview'), '/admin/categories')).toBe(false);
    expect(isNavItemActive(item('Categories'), '/admin/categories/abc/edit')).toBe(true);
    expect(isNavItemActive(item('Categories'), '/admin/categoriesx')).toBe(false);
  });

  it('builds breadcrumbs with a non-linked current page', () => {
    expect(getAdminBreadcrumbs('/admin')).toEqual([{ label: 'Admin', href: '/admin' }, { label: 'Overview' }]);
    expect(getAdminBreadcrumbs('/admin/categories')).toEqual([
      { label: 'Admin', href: '/admin' },
      { label: 'Categories' },
    ]);
    expect(getAdminBreadcrumbs('/admin/categories/new')).toEqual([
      { label: 'Admin', href: '/admin' },
      { label: 'Categories', href: '/admin/categories' },
      { label: 'New category' },
    ]);
    expect(getAdminBreadcrumbs('/admin/categories/123/edit').at(-1)).toEqual({ label: 'Edit category' });
    expect(getAdminBreadcrumbs('/admin/products')).toEqual([
      { label: 'Admin', href: '/admin' },
      { label: 'Products' },
    ]);
    expect(getAdminBreadcrumbs('/admin/products/new')).toEqual([
      { label: 'Admin', href: '/admin' },
      { label: 'Products', href: '/admin/products' },
      { label: 'New product' },
    ]);
    expect(getAdminBreadcrumbs('/admin/products/prod-123/edit').at(-1)).toEqual({ label: 'Edit product' });
  });

  it('only hides storefront chrome on admin routes', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/categories')).toBe(true);
    expect(isAdminPath('/administrator')).toBe(false);
    expect(isAdminPath('/customer/dashboard')).toBe(false);
    expect(isAdminPath('/')).toBe(false);
  });
});

describe('category utils', () => {
  const tree = [
    category('root', 'Electronics', null),
    category('phones', 'Phones', 'root'),
    category('android', 'Android', 'phones', false),
    category('fashion', 'Fashion', null),
  ];

  it('collects a category and all of its descendants', () => {
    expect([...getDescendantIds(tree, 'root')].sort()).toEqual(['android', 'phones', 'root']);
    expect([...getDescendantIds(tree, 'fashion')]).toEqual(['fashion']);
  });

  it('filters by status and search term', () => {
    expect(filterCategories(tree, '', 'inactive').map((c) => c.id)).toEqual(['android']);
    expect(filterCategories(tree, 'PHO', 'all').map((c) => c.id)).toEqual(['phones']);
    expect(filterCategories(tree, '', 'active')).toHaveLength(3);
  });

  it('slugifies like the catalog service', () => {
    expect(slugify('  Home & Kitchen ')).toBe('home-kitchen');
  });
});
