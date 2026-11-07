import { Suspense } from 'react';
import { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Reset Password | Shopkart',
  description: 'Set a new password for your Shopkart account',
};

function ResetPasswordFallback() {
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
      <div className="h-4 w-64 bg-gray-200 rounded mx-auto mb-6"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 rounded"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
        <div className="h-10 bg-accent-200 rounded"></div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<ResetPasswordFallback />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
