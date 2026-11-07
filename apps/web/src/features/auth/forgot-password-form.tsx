'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api-client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = (): boolean => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError('Please enter a valid email address.');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Anti-enumeration: always display successful dispatch message
      setIsSubmitted(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else if (err?.message) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Forgot your password?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your registered email address and we will send you instructions to reset your password.
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
          <div>
            <span className="font-semibold">Request Failed: </span>
            {serverError}
          </div>
        </div>
      )}

      {isSubmitted ? (
        <div className="space-y-6">
          <div
            role="status"
            className="rounded-lg bg-green-50 p-5 border border-green-200 text-sm text-green-800 flex items-start space-x-3"
          >
            <svg className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-900">Recovery Instructions Sent</p>
              <p className="mt-1 text-green-700">
                If an account exists with this email, password recovery instructions will be sent.
                Please check your inbox (and spam folder) for the reset link.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
              }}
              className="text-sm font-medium text-accent-600 hover:text-accent-700 text-center"
            >
              Send another link
            </button>
            <Link
              href="/login"
              className="w-full inline-flex justify-center rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none sm:text-sm ${
                  fieldError
                    ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-300 focus:border-accent-500 focus:ring-1 focus:ring-accent-500'
                } ${isSubmitting ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                placeholder="name@example.com"
              />
            </div>
            {fieldError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium" role="alert">
                {fieldError}
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
                Sending recovery link...
              </>
            ) : (
              'Send Reset Link'
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
