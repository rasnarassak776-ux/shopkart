'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';
import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';

const COLLAPSED_STORAGE_KEY = 'shopkart_admin_sidebar_collapsed';

/**
 * Admin console shell: fixed (collapsible) sidebar on desktop, drawer navigation
 * on tablet/mobile, sticky top bar. Route protection is applied by the
 * `/admin` route layout via the shared ProtectedRoute component.
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true');
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(!prev));
      return !prev;
    });
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
  }, [logout, router]);

  return (
    <div className="flex min-h-screen flex-1 bg-canvas">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-line transition-[width] duration-200 lg:block',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]" onClick={closeDrawer} aria-hidden="true" />
          <div ref={drawerRef} className="absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-overlay">
            <AdminSidebar onClose={closeDrawer} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
          </div>
        </div>
      )}

      <div className={cn('flex min-w-0 flex-1 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-64')}>
        <AdminHeader onOpenNavigation={() => setDrawerOpen(true)} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
        <div id="admin-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
