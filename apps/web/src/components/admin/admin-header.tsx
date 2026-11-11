'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ChevronDownIcon, ExternalLinkIcon, LogoutIcon, MenuIcon, SettingsIcon, UserIcon } from '@/components/ui';
import { AdminBreadcrumbs } from './admin-breadcrumbs';
import { getAdminBreadcrumbs } from './admin-nav';
import { UserRole } from '@shopkart/common';
import { NotificationBell } from '@/features/notifications';

interface AdminHeaderProps {
  onOpenNavigation: () => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

function AdminUserMenu({ onLogout, isLoggingOut }: Pick<AdminHeaderProps, 'onLogout' | 'isLoggingOut'>) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;
  const displayName = user.name || user.email.split('@')[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 items-center gap-2.5 rounded-lg px-1.5 text-ink transition-colors hover:bg-surface-muted sm:px-2"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold uppercase text-white">
          {displayName.charAt(0)}
        </span>
        <span className="hidden max-w-[10rem] text-left leading-tight md:block">
          <span className="block truncate font-display text-sm font-semibold">{displayName}</span>
          <span className="block text-xs capitalize text-ink-muted">{user.role}</span>
        </span>
        <ChevronDownIcon className="hidden h-4 w-4 text-ink-muted md:block" />
        <span className="sr-only md:hidden">Open user menu</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-overlay">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-display text-sm font-semibold text-ink">{displayName}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-accent-700 ring-1 ring-inset ring-accent-200">
              {user.role}
            </span>
          </div>
          <ul className="py-1.5">
            <li>
              <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                <UserIcon className="h-4 w-4 text-ink-muted" />
                Profile &amp; security
              </Link>
            </li>
            <li>
              <Link role="menuitem" href={user.role === UserRole.SUPERADMIN ? '/superadmin/settings' : '/merchant/settings'} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                <SettingsIcon className="h-4 w-4 text-ink-muted" />
                Settings
              </Link>
            </li>
            <li>
              <Link role="menuitem" href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-muted">
                <ExternalLinkIcon className="h-4 w-4 text-ink-muted" />
                View storefront
              </Link>
            </li>
          </ul>
          <div className="border-t border-line py-1.5">
            <button
              role="menuitem"
              type="button"
              disabled={isLoggingOut}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-muted disabled:opacity-60"
            >
              <LogoutIcon className="h-4 w-4 text-ink-muted" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminHeader({ onOpenNavigation, onLogout, isLoggingOut }: AdminHeaderProps) {
  const pathname = usePathname() ?? '/merchant';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
          className="-ml-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-surface-muted lg:hidden"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <AdminBreadcrumbs items={getAdminBreadcrumbs(pathname)} className="flex-1" />
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-secondary ring-1 ring-inset ring-line-strong transition-colors hover:bg-surface-muted hover:text-ink sm:inline-flex"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            Storefront
          </Link>
          <NotificationBell />
          <AdminUserMenu onLogout={onLogout} isLoggingOut={isLoggingOut} />
        </div>
      </div>
    </header>
  );
}
