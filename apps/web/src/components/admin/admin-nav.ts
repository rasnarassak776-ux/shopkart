import type React from 'react';
import {
  ClipboardIcon,
  DashboardIcon,
  PackageIcon,
  SettingsIcon,
  ShieldIcon,
  ShoppingBagIcon,
  TagIcon,
  UsersIcon,
  type IconProps,
} from '@/components/ui';
import { UserRole } from '@shopkart/common';

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
      { label: 'Products', href: '/admin/products', icon: ShoppingBagIcon, availability: 'available' },
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

/** Superadmin-only console sections (shown above the inherited admin sections). */
export const superadminNavSections: AdminNavSection[] = [
  {
    title: 'Superadmin',
    items: [
      { label: 'Platform overview', href: '/superadmin/dashboard', icon: ShieldIcon, availability: 'available', exact: true },
      { label: 'Admin accounts', href: '/superadmin/admins', icon: UsersIcon, availability: 'available' },
      { label: 'Platform settings', href: '/superadmin/settings', icon: SettingsIcon, availability: 'available' },
    ],
  },
];

/** Console navigation for a verified role. Other roles get nothing (they never reach the console). */
export function getConsoleNavSections(role: string | null | undefined): AdminNavSection[] {
  if (role === UserRole.SUPERADMIN) return [...superadminNavSections, ...adminNavSections];
  if (role === UserRole.ADMIN) return adminNavSections;
  return [];
}

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

const allNavItems = adminNavSections.flatMap((section) => section.items);

function getSuperadminBreadcrumbs(segments: string[]): AdminBreadcrumb[] {
  const crumbs: AdminBreadcrumb[] = [{ label: 'Superadmin', href: '/superadmin/dashboard' }];
  if (segments.length === 0 || segments[0] === 'dashboard') {
    crumbs.push({ label: 'Overview' });
  } else if (segments[0] === 'admins') {
    crumbs.push({ label: 'Admin accounts', href: '/superadmin/admins' });
    if (segments[1] === 'create') crumbs.push({ label: 'Create admin' });
    else if (segments[1]) crumbs.push({ label: 'Admin details' });
  } else if (segments[0] === 'settings') {
    crumbs.push({ label: 'Platform settings' });
  } else {
    crumbs.push({ label: segments[0] });
  }
  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { label: last.label };
  return crumbs;
}

/** Derives breadcrumbs for the current admin/superadmin route. The last crumb has no href. */
export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  if (pathname === '/superadmin' || pathname.startsWith('/superadmin/')) {
    return getSuperadminBreadcrumbs(pathname.replace(/\/+$/, '').split('/').filter(Boolean).slice(1));
  }
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
  } else if (segments[0] === 'products' && segments[1] === 'new') {
    crumbs.push({ label: 'New product' });
  } else if (segments[0] === 'products' && segments[2] === 'edit') {
    crumbs.push({ label: 'Edit product' });
  }

  const last = crumbs[crumbs.length - 1];
  crumbs[crumbs.length - 1] = { label: last.label };
  return crumbs;
}
