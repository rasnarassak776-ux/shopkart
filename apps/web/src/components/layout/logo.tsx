import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('h-8 w-8 shrink-0', className)}>
      <rect width="32" height="32" rx="9" className="fill-accent-600" />
      <path
        d="M10 12.5h12l-1 10.2a2 2 0 0 1-2 1.8h-6a2 2 0 0 1-2-1.8L10 12.5Z"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13 12.5V11a3 3 0 0 1 6 0v1.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="Shopkart home" className={cn('inline-flex items-center gap-2 rounded-lg', className)}>
      <LogoMark />
      <span
        className={cn(
          'font-display text-xl font-extrabold tracking-tight',
          inverse ? 'text-white' : 'text-ink',
        )}
      >
        Shop<span className={inverse ? 'text-accent-400' : 'text-accent-600'}>kart</span>
      </span>
    </Link>
  );
}
