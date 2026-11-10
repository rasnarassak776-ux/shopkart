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

describe('merchant navigation', () => {
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
    expect(item('Orders').availability).toBe('available');
    expect(item('Inventory').availability).toBe('available');
    expect(item('Customers').availability).toBe('coming-soon');
    expect(item('Products').availability).toBe('available');
    expect(item('Categories').availability).toBe('available');
  });

  it('matches overview exactly and sections by prefix', () => {
    expect(isNavItemActive(item('Overview'), '/merchant')).toBe(true);
    expect(isNavItemActive(item('Overview'), '/merchant/categories')).toBe(false);
    expect(isNavItemActive(item('Categories'), '/merchant/categories/abc/edit')).toBe(true);
    expect(isNavItemActive(item('Categories'), '/merchant/categoriesx')).toBe(false);
  });

  it('builds breadcrumbs with a non-linked current page', () => {
    expect(getAdminBreadcrumbs('/merchant')).toEqual([{ label: 'Merchant', href: '/merchant' }, { label: 'Overview' }]);
    expect(getAdminBreadcrumbs('/merchant/categories')).toEqual([
      { label: 'Merchant', href: '/merchant' },
      { label: 'Categories' },
    ]);
    expect(getAdminBreadcrumbs('/merchant/categories/new')).toEqual([
      { label: 'Merchant', href: '/merchant' },
      { label: 'Categories', href: '/merchant/categories' },
      { label: 'New category' },
    ]);
    expect(getAdminBreadcrumbs('/merchant/categories/123/edit').at(-1)).toEqual({ label: 'Edit category' });
    expect(getAdminBreadcrumbs('/merchant/products')).toEqual([
      { label: 'Merchant', href: '/merchant' },
      { label: 'Products' },
    ]);
    expect(getAdminBreadcrumbs('/merchant/products/new')).toEqual([
      { label: 'Merchant', href: '/merchant' },
      { label: 'Products', href: '/merchant/products' },
      { label: 'New product' },
    ]);
    expect(getAdminBreadcrumbs('/merchant/products/prod-123/edit').at(-1)).toEqual({ label: 'Edit product' });
  });

  it('only hides storefront chrome on merchant routes', () => {
    expect(isAdminPath('/merchant')).toBe(true);
    expect(isAdminPath('/merchant/categories')).toBe(true);
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
