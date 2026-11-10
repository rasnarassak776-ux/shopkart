'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/layout/logo';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, LogoutIcon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import { getRoleHomePath, getRoleLabel } from '@/lib/roles';
import { getConsoleNavSections, isNavItemActive, type AdminNavItem } from './admin-nav';

interface AdminSidebarProps {
  /** Desktop icon-rail mode. Ignored in the mobile/tablet drawer. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Present when rendered inside the drawer. */
  onClose?: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

const itemBase =
  'group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600';

function AvailabilityBadge({ item }: { item: AdminNavItem }) {
  if (item.availability === 'available') return null;
  return (
    <span className="ml-auto shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted ring-1 ring-inset ring-line">
      {item.availability === 'next-phase' ? 'Next phase' : 'Soon'}
    </span>
  );
}

function NavEntry({ item, collapsed, onNavigate }: { item: AdminNavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname() ?? '';
  const Icon = item.icon;
  const active = isNavItemActive(item, pathname);
  const label = collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>;

  if (item.availability === 'coming-soon') {
    return (
      <span
        aria-disabled="true"
        title={`${item.label} — coming soon${item.owner ? ` (${item.owner})` : ''}`}
        className={cn(itemBase, 'cursor-not-allowed text-ink-muted/80', collapsed && 'justify-center px-0')}
      >
        <Icon className="h-5 w-5 shrink-0 opacity-70" />
        {label}
        {!collapsed && <AvailabilityBadge item={item} />}
        {collapsed && <span className="sr-only"> (coming soon)</span>}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        itemBase,
        active ? 'bg-accent-50 text-accent-700' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
        collapsed && 'justify-center px-0',
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent-600" />}
      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-accent-600' : 'text-ink-muted group-hover:text-ink')} />
      {label}
      {!collapsed && <AvailabilityBadge item={item} />}
    </Link>
  );
}

export function AdminSidebar({ collapsed = false, onToggleCollapsed, onClose, onLogout, isLoggingOut }: AdminSidebarProps) {
  const { user } = useAuth();
  const navSections = getConsoleNavSections(user?.role);
  const consoleLabel = getRoleLabel(user?.role);
  const isDrawer = Boolean(onClose);
  const rail = collapsed && !isDrawer;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={cn('flex h-16 shrink-0 items-center border-b border-line px-4', rail ? 'justify-center px-0' : 'justify-between')}>
        <Link href={getRoleHomePath(user?.role)} onClick={onClose} aria-label={`Shopkart ${consoleLabel} overview`} className="inline-flex items-center gap-2 rounded-lg">
          <LogoMark />
          {!rail && (
            <span className="font-display text-lg font-extrabold leading-none tracking-tight text-ink">
              Shop<span className="text-accent-600">kart</span>
              <span className="ml-1.5 align-middle text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {consoleLabel}
              </span>
            </span>
          )}
        </Link>
        {isDrawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface-muted"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            {rail ? (
              <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden="true" />
            ) : (
              <p className="mb-1.5 px-3 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {section.title}
              </p>
            )}
            <ul className="grid gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavEntry item={item} collapsed={rail} onNavigate={onClose} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          title={rail ? 'Log out' : undefined}
          className={cn(itemBase, 'w-full text-ink-secondary hover:bg-danger-soft hover:text-danger disabled:opacity-60', rail && 'justify-center px-0')}
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          {rail ? <span className="sr-only">Log out</span> : <span>{isLoggingOut ? 'Logging out…' : 'Log out'}</span>}
        </button>
        {onToggleCollapsed && !isDrawer && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(itemBase, 'mt-1 w-full text-ink-muted hover:bg-surface-muted hover:text-ink', rail && 'justify-center px-0')}
          >
            {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
            {!rail && <span>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}
