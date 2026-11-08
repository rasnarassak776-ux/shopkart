import type React from 'react';
import {
  ClipboardIcon,
  DashboardIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagIcon,
  UsersIcon,
  type IconProps,
} from '@/components/ui';

export type AdminNavAvailability = 'available' | 'next-phase' | 'coming-soon';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: (props: IconProps) => React.ReactElement;
  availability: AdminNavAvailability;
  /** Only highlight on the exact path (used for the overview root). */
  exact?: boolean;
  /** Owning module, shown for not-yet-integrated services. */
  owner?: string;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

/**
 * Single source of truth for the admin console navigation.
 * To integrate a future module (Orders – Member 3, Inventory – Member 4),
 * build its page under `/admin/<module>` and flip `availability` to `available`.
 */
export const adminNavSections: AdminNavSection[] = [
  {
    title: 'Store',
    items: [
      { label: 'Overview', href: '/admin', icon: DashboardIcon, availability: 'available', exact: true },
      { label: 'Products', href: '/admin/products', icon: ShoppingBagIcon, availability: 'next-phase' },
      { label: 'Categories', href: '/admin/categories', icon: TagIcon, availability: 'available' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ClipboardIcon, availability: 'coming-soon', owner: 'Order service' },
      { label: 'Inventory', href: '/admin/inventory', icon: PackageIcon, availability: 'coming-soon', owner: 'Inventory service' },
      { label: 'Customers', href: '/admin/customers', icon: UsersIcon, availability: 'coming-soon', owner: 'User management' },
    ],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', href: '/admin/settings', icon: SettingsIcon, availability: 'available' }],
  },
];

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

const allNavItems = adminNavSections.flatMap((section) => section.items);

/** Derives breadcrumbs for the current admin route. The last crumb has no href. */
export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  const crumbs: AdminBreadcrumb[] = [{ label: 'Admin', href: '/admin' }];
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean).slice(1);

  if (segments.length === 0) {
    return [...crumbs, { label: 'Overview' }];
  }

  const section = allNavItems.find((item) => item.href === `/admin/${segments[0]}`);
  crumbs.push({ label: section?.label ?? segments[0], href: `/admin/${segments[0]}` });

  if (segments[0] === 'categories' && segments[1] === 'new') {
    crumbs.push({ label: 'New category' });
  } else if (segments[0] === 'categories' && segments[2] === 'edit') {
    crumbs.push({ label: 'Edit category' });
  }

  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { label: last.label };
  return crumbs;
}
