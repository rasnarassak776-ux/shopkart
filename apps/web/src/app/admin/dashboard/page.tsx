'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/hooks/use-auth';

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Admin Console Dashboard</h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-900 ring-1 ring-inset ring-gray-900/10">
              Administrator Role
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            System Administration & Control Center — Authenticated as <span className="font-medium text-gray-900">{user?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Storefront
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Admin Info Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Administrator Account Profile
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500 font-medium">Administrator Name</dt>
              <dd className="mt-1 text-gray-900 font-semibold">{user?.name || 'Shopkart Admin'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Email Address</dt>
              <dd className="mt-1 text-gray-900 font-semibold">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Security Role</dt>
              <dd className="mt-1 font-semibold text-gray-900 capitalize">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Admin ID (UUID)</dt>
              <dd className="mt-1 text-xs font-mono text-gray-600 truncate">{user?.id}</dd>
            </div>
          </dl>
        </div>

        {/* System Status Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Platform Security Status
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between text-gray-700">
              <span>Auth Service</span>
              <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                Active (Port 3010)
              </span>
            </li>
            <li className="flex items-center justify-between text-gray-700">
              <span>RBAC Status</span>
              <span className="inline-flex items-center text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                RolesGuard Active
              </span>
            </li>
            <li className="flex items-center justify-between text-gray-700">
              <span>Session Storage</span>
              <span className="inline-flex items-center text-xs font-medium text-accent-700 bg-accent-50 px-2 py-0.5 rounded-full">
                Redis 7 (Port 6379)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
