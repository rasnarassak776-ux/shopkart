import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-100 flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-600 border-t-transparent" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
