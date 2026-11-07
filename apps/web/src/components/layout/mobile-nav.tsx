'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { buttonClasses, ChevronRightIcon, CloseIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import type { CategorySummary } from '@/features/storefront/types';
import { Logo } from './logo';
import { getAccountLinks } from './nav-links';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  categories: CategorySummary[];
}

export function MobileNav({ open, onClose, categories }: MobileNavProps) {
  const { user, isAuthenticated } = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shop by category">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-surface shadow-overlay">
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Logo />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={buttonClasses({ variant: 'ghost', size: 'icon' })}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-line p-4">
            {isAuthenticated && user ? (
              <>
                <p className="text-xs text-ink-muted">Signed in as</p>
                <p className="truncate font-display text-sm font-semibold text-ink">{user.name || user.email}</p>
                <ul className="mt-3 grid gap-1">
                  {getAccountLinks(user.role).map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-muted"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" onClick={onClose} className={buttonClasses({ variant: 'accent', size: 'sm' })}>
                  Sign in
                </Link>
                <Link href="/register" onClick={onClose} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Create account
                </Link>
              </div>
            )}
          </div>

          <nav aria-label="Categories" className="p-4">
            <p className={`${textStyles.eyebrow} mb-2 px-1 text-ink-muted`}>Shop by category</p>
            <ul className="grid gap-0.5">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={category.href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-1 py-2 text-ink hover:bg-surface-muted"
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                      <Image src={category.image.src} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="flex-1 font-display text-sm font-medium">{category.name}</span>
                    <ChevronRightIcon className="h-4 w-4 text-ink-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
