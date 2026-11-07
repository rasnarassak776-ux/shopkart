'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api-client';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string>('');
  const [hasCheckedToken, setHasCheckedToken] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    const rawToken = searchParams.get('token');
    if (rawToken) {
      setToken(rawToken);
      // Security best practice: Sanitize visible URL to strip sensitive token from history
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    setHasCheckedToken(true);
  }, [searchParams]);

  // Real-time password criteria
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);

  const validate = (): boolean => {
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      errors.newPassword =
        'Password must be at least 8 characters and contain uppercase, lowercase, and numeric characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!token) {
      setServerError('Reset token is missing. Please request a new recovery link.');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err?.message) {
        setServerError(err.message);
      } else {
        setServerError('Unable to reset password. Please try again or request a new link.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasCheckedToken && !token && !isSuccess) {
    return (
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          Invalid or Missing Reset Link
        </h2>
        <p className="text-sm text-gray-600">
          No valid recovery token was detected. This link may have expired, already been used, or been entered incorrectly.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="w-full inline-flex justify-center rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Set New Password
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Please enter and confirm your new secure account password.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-800 flex items-start space-x-2"
        >
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <span className="font-semibold">Reset Failed: </span>
            {serverError}
            <div className="mt-2">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-red-700 underline hover:text-red-900"
              >
                Request a new link →
              </Link>
            </div>
          </div>
        </div>
      )}

      {isSuccess ? (
        <div className="space-y-6">
          <div
            role="status"
            className="rounded-lg bg-green-50 p-5 border border-green-200 text-sm text-green-800 flex items-start space-x-3"
          >
            <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-900">Password Reset Successful</p>
              <p className="mt-1 text-green-700">
                Your password has been reset successfully. Redirecting you to the sign-in page in a moment...
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full inline-flex justify-center rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative mt-1">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }
                }}
                className={`block w-full rounded-lg border px-3.5 py-2.5 pr-10 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none sm:text-sm ${
                  fieldErrors.newPassword
                    ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-300 focus:border-accent-500 focus:ring-1 focus:ring-accent-500'
                } ${isSubmitting ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                {fieldErrors.newPassword}
              </p>
            )}

            {/* Password requirements visual helper */}
            <div className="mt-2.5 rounded-md bg-gray-50 p-2.5 border border-gray-100 text-xs space-y-1">
              <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                <span>{hasMinLength ? '✓' : '•'}</span>
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${hasUppercase && hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                <span>{hasUppercase && hasLowercase ? '✓' : '•'}</span>
                <span>Uppercase & lowercase letters</span>
              </div>
              <div className={`flex items-center space-x-1.5 ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                <span>{hasNumber ? '✓' : '•'}</span>
                <span>At least one number</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                className={`block w-full rounded-lg border px-3.5 py-2.5 pr-10 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none sm:text-sm ${
                  fieldErrors.confirmPassword
                    ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-300 focus:border-accent-500 focus:ring-1 focus:ring-accent-500'
                } ${isSubmitting ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Resetting password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              ← Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
