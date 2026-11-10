'use client';

import Link from 'next/link';
import { AdminPageHeader, AdminPanel } from '@/components/admin';
import { ArrowRightIcon, Badge, ShieldIcon } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

const roleMatrix = [
  { role: 'Customer', access: 'Storefront, cart, checkout, own orders, profile and addresses.', provisioning: 'Public registration' },
  { role: 'Admin', access: 'Store admin console: products, categories, orders, inventory.', provisioning: 'Created by a superadmin' },
  { role: 'Superadmin', access: 'Everything an admin can do, plus admin account management and audit activity.', provisioning: 'One-time CLI bootstrap' },
];

export function SuperadminSettings() {
  const { user } = useAuth();

  return (
    <>
      <AdminPageHeader title="Platform settings" description="Your superadmin account and the platform role model." />

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminPanel className="lg:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Superadmin account</h2>
          </div>
          <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Name</dt>
              <dd className="mt-0.5 font-medium text-ink">{user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Email</dt>
              <dd className="mt-0.5 break-all font-medium text-ink">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Role</dt>
              <dd className="mt-1">
                <Badge variant="accent" className="capitalize">{user?.role}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Account ID</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-ink-secondary">{user?.id}</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel className="p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <h2 className="mt-3 font-display text-base font-semibold text-ink">Profile &amp; security</h2>
          <p className="mt-1 text-sm text-ink-secondary">Update your name, phone number and password.</p>
          <Link
            href="/profile"
            className="group mt-4 inline-flex min-h-[44px] items-center gap-1.5 font-display text-sm font-semibold text-accent-600 hover:text-accent-700"
          >
            Manage profile
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </AdminPanel>
      </div>

      <AdminPanel className="mt-6">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">Role model</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            All roles share one login and one user table; access is enforced by the backend on every request.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-muted/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3">Role</th>
                <th scope="col" className="px-5 py-3">Access</th>
                <th scope="col" className="px-5 py-3">Provisioning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roleMatrix.map((row) => (
                <tr key={row.role}>
                  <td className="px-5 py-3 font-medium text-ink">{row.role}</td>
                  <td className="px-5 py-3 text-ink-secondary">{row.access}</td>
                  <td className="px-5 py-3 text-ink-secondary">{row.provisioning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </>
  );
}
