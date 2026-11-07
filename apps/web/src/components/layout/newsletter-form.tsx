'use client';

import React, { useId, useState } from 'react';
import { Button } from '@/components/ui';

/** UI only — no subscription backend exists yet, so submissions are not sent anywhere. */
export function NewsletterForm() {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'invalid' | 'pending'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'pending' : 'invalid');
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          placeholder="Enter your email"
          autoComplete="email"
          aria-invalid={status === 'invalid' || undefined}
          className="h-11 flex-1 rounded-lg border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-gray-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30"
        />
        <Button type="submit" variant="accent">
          Subscribe
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs text-gray-400">
        {status === 'invalid' && <span className="text-accent-300">Please enter a valid email address.</span>}
        {status === 'pending' && 'Thanks! Newsletter subscriptions are launching soon.'}
      </p>
    </form>
  );
}
