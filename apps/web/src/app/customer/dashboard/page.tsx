'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/hooks/use-auth';

function CustomerDashboardContent() {
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
            <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
            <span className="inline-flex items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-700/10">
              Customer Role
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-900">{user?.name || user?.email}</span>
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

      {/* Account Info Card */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Account Details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500 font-medium">Full Name</dt>
              <dd className="mt-1 text-gray-900 font-semibold">{user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Email Address</dt>
              <dd className="mt-1 text-gray-900 font-semibold">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">Assigned Role</dt>
              <dd className="mt-1 text-gray-900 font-semibold capitalize">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium">User Identifier (UUID)</dt>
              <dd className="mt-1 text-xs font-mono text-gray-600 truncate">{user?.id}</dd>
            </div>
            {user?.phone && (
              <div>
                <dt className="text-gray-500 font-medium">Phone</dt>
                <dd className="mt-1 text-gray-900 font-semibold">{user.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Quick Links Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Quick Navigation
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/customer/orders"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium group"
              >
                <span>My Orders</span>
                <span className="text-gray-400 group-hover:text-accent-600">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/profile"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium group"
              >
                <span>Manage Profile</span>
                <span className="text-gray-400 group-hover:text-accent-600">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/addresses"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium group"
              >
                <span>Saved Addresses</span>
                <span className="text-gray-400 group-hover:text-accent-600">→</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <CustomerDashboardContent />
    </ProtectedRoute>
  );
}
