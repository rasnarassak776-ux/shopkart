'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 mb-2">
          Member 1 • Authentication & User Management
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Shopkart E-Commerce
        </h1>
        <p className="text-lg text-gray-600">
          Secure Microservices Platform with NestJS, Next.js, PostgreSQL 17, and Redis 7.
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center py-4 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2" />
            Loading authentication status...
          </div>
        ) : isAuthenticated && user ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 text-left max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500">
                Authenticated Session
              </span>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20 capitalize">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-gray-700">
              Signed in as <span className="font-semibold text-gray-900">{user.email}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard'}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => logout()}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Create Account
            </Link>
            <Link
              href="/customer/dashboard"
              className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Customer Area (Protected)
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Admin Area (Protected)
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
