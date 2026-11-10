'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';
import { getRoleHomePath, hasRole } from '../lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: readonly string[];
}

/**
 * Client-side gate for authenticated pages. `user.role` comes from the backend
 * (login response or /auth/me on restore), and every API behind these pages
 * enforces the same roles server-side — this component is a UX layer only.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isRestricted = Boolean(allowedRoles && allowedRoles.length > 0);
  const isAuthorized = !isRestricted || (user ? hasRole(user.role, allowedRoles!) : false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    if (user && !isAuthorized) {
      // A role's home path is never guarded against that role, so this cannot loop.
      router.replace(getRoleHomePath(user.role));
    }
  }, [isAuthenticated, isLoading, user, isAuthorized, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-gray-600">
          Verifying authentication session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-400 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  if (user && !isAuthorized) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-100 p-3 text-red-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="mt-2 text-sm text-gray-600 max-w-md">
          Your current account role (<span className="font-semibold">{user.role}</span>) does not have permission to view this section.
        </p>
        <button
          onClick={() => router.push(getRoleHomePath(user.role))}
          className="mt-6 inline-flex items-center rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
