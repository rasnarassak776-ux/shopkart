'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/** True for the merchant & superadmin consoles, which render their own chrome (sidebar + header). */
export function isAdminPath(pathname: string | null): boolean {
  return ['/merchant', '/superadmin'].some(
    (prefix) => pathname === prefix || Boolean(pathname?.startsWith(`${prefix}/`)),
  );
}

/** Renders storefront chrome (header/footer) everywhere except the merchant consoles. */
export function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isAdminPath(pathname) ? null : <>{children}</>;
}
