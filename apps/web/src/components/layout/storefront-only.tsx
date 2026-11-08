'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/** True for the admin console, which renders its own chrome (sidebar + header). */
export function isAdminPath(pathname: string | null): boolean {
  return pathname === '/admin' || Boolean(pathname?.startsWith('/admin/'));
}

/** Renders storefront chrome (header/footer) everywhere except the admin console. */
export function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isAdminPath(pathname) ? null : <>{children}</>;
}
