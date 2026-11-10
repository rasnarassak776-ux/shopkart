'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminErrorState, AdminPageHeader, AdminPanel, AdminStatCard, type AdminStatStatus } from '@/components/admin';
import {
  ArrowRightIcon,
  Badge,
  buttonClasses,
  CheckIcon,
  ClipboardIcon,
  ExternalLinkIcon,
  PackageIcon,
  PlusIcon,
  ShoppingBagIcon,
  TagIcon,
  UsersIcon,
  type IconProps,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api-client';
import { getAdminCatalogStats } from './admin-catalog-api';
import type { CatalogAdminStats } from './types';

interface ModuleStatus {
  name: string;
  description: string;
  icon: (props: IconProps) => React.ReactElement;
  status: 'live' | 'next-phase' | 'coming-soon';
  href?: string;
}

const modules: ModuleStatus[] = [
  { name: 'Category management', description: 'Create, edit and publish catalog categories.', icon: TagIcon, status: 'live', href: '/merchant/categories' },
  { name: 'Product management', description: 'Product CRUD, pricing and images.', icon: ShoppingBagIcon, status: 'live', href: '/merchant/products' },
  { name: 'Orders', description: 'Order processing and fulfilment (order service).', icon: ClipboardIcon, status: 'live', href: '/merchant/orders' },
  { name: 'Inventory', description: 'Stock levels and reservations (inventory service).', icon: PackageIcon, status: 'live', href: '/merchant/inventory' },
  { name: 'Customers', description: 'Customer accounts administration.', icon: UsersIcon, status: 'coming-soon' },
];

const moduleBadge: Record<ModuleStatus['status'], React.ReactNode> = {
  live: <Badge variant="success"><CheckIcon className="h-3 w-3" />Live</Badge>,
  'next-phase': <Badge variant="accent">Next phase</Badge>,
  'coming-soon': <Badge variant="neutral">Coming soon</Badge>,
};

export function AdminOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CatalogAdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await getAdminCatalogStats());
    } catch (err) {
      setStats(null);
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Unable to load catalog statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const status: AdminStatStatus = loading ? 'loading' : stats ? 'ready' : 'unavailable';
  const firstName = user?.name?.split(' ')[0] || user?.email.split('@')[0];

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description={`Welcome back${firstName ? `, ${firstName}` : ''}. Here is the current state of the Shopkart catalog.`}
        actions={
          <>
            <Link href="/" className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'h-10' })}>
              <ExternalLinkIcon className="h-4 w-4" />
              View storefront
            </Link>
            <Link href="/merchant/categories/new" className={buttonClasses({ size: 'sm', className: 'h-10' })}>
              <PlusIcon className="h-4 w-4" />
              New category
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-6">
          <AdminErrorState message={`Catalog statistics are unavailable: ${error}`} onRetry={load} />
        </div>
      )}

      <section aria-label="Catalog summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Total products"
          value={stats?.products.total}
          status={status}
          icon={ShoppingBagIcon}
          hint="All products, including inactive"
        />
        <AdminStatCard
          label="Total categories"
          value={stats?.categories.total}
          status={status}
          icon={TagIcon}
          tone="neutral"
          hint={stats && `${stats.categories.active} active · ${stats.categories.inactive} inactive`}
        />
        <AdminStatCard
          label="Active products"
          value={stats?.products.active}
          status={status}
          icon={CheckIcon}
          tone="success"
          hint="Visible on the storefront"
        />
        <AdminStatCard
          label="Inactive products"
          value={stats?.products.inactive}
          status={status}
          icon={PackageIcon}
          tone="warning"
          hint="Hidden from customers"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-5">
        <AdminPanel className="lg:col-span-3">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Merchant modules</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Sections become available as each service is integrated.</p>
          </div>
          <ul className="divide-y divide-line">
            {modules.map((module) => {
              const Icon = module.icon;
              const content = (
                <>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{module.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{module.description}</span>
                  </span>
                  <span className="shrink-0">{moduleBadge[module.status]}</span>
                </>
              );
              return (
                <li key={module.name}>
                  {module.href ? (
                    <Link href={module.href} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted/60">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-5 py-3.5 opacity-80">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </AdminPanel>

        <AdminPanel className="p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink">Quick actions</h2>
          <ul className="mt-4 grid gap-2">
            {[
              { label: 'Manage orders', href: '/merchant/orders' },
              { label: 'Manage products', href: '/merchant/products' },
              { label: 'Manage categories', href: '/merchant/categories' },
              { label: 'Add a new category', href: '/merchant/categories/new' },
              { label: 'Browse the live catalog', href: '/products' },
              { label: 'Profile & security', href: '/profile' },
            ].map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="group flex min-h-[44px] items-center justify-between rounded-lg border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-accent-200 hover:bg-accent-50"
                >
                  {action.label}
                  <ArrowRightIcon className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-600" />
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </>
  );
}
