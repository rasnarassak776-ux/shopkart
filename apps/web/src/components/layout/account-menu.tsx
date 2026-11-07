'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ChevronDownIcon, LogoutIcon, Skeleton, UserIcon } from '@/components/ui';
import { getAccountLinks } from './nav-links';

const triggerClasses =
  'inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-ink transition-colors hover:bg-surface-muted';

export function AccountMenu() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
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

  if (isLoading) {
    return <Skeleton className="h-10 w-10 lg:w-28" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Link href="/login" className={triggerClasses}>
        <UserIcon className="h-[22px] w-[22px]" />
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-xs text-ink-muted">Hello, sign in</span>
          <span className="block font-display text-sm font-semibold">Account</span>
        </span>
        <span className="sr-only lg:hidden">Sign in</span>
      </Link>
    );
  }

  const firstName = user.name?.split(' ')[0] || user.email.split('@')[0];

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClasses}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 font-display text-sm font-bold uppercase text-accent-700">
          {firstName.charAt(0)}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-xs text-ink-muted">Hello, {firstName}</span>
          <span className="block font-display text-sm font-semibold">Account</span>
        </span>
        <ChevronDownIcon className="hidden h-4 w-4 text-ink-muted lg:block" />
        <span className="sr-only lg:hidden">Account menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-display text-sm font-semibold text-ink">{user.name || firstName}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <ul className="py-1.5">
            {getAccountLinks(user.role).map((link) => (
              <li key={link.href}>
                <Link
                  role="menuitem"
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-ink hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line py-1.5">
            <button
              role="menuitem"
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-surface-muted"
            >
              <LogoutIcon className="h-4 w-4 text-ink-muted" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
