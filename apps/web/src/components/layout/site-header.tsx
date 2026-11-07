'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonClasses, CartIcon, Container, GridIcon, HeartIcon, MenuIcon, TagIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { PLACEHOLDER_HREF, presentationCategories } from '@/features/storefront/presentation-data';
import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';
import { SearchBar } from './search-bar';

const utilityLinks = [
  { label: 'Help centre', href: PLACEHOLDER_HREF },
  { label: 'Track order', href: PLACEHOLDER_HREF },
  { label: 'Sell on Shopkart', href: PLACEHOLDER_HREF },
];

const iconButton = cn(buttonClasses({ variant: 'ghost', size: 'icon' }), 'relative');

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
      >
        Skip to content
      </a>

      <div className="bg-primary text-white">
        <Container className="flex h-9 items-center justify-center text-xs sm:justify-between">
          <p className="truncate">
            <span className="font-semibold text-accent-300">Free delivery</span> on orders above ₹499
            <span className="hidden sm:inline"> · Easy 7-day returns</span>
          </p>
          <nav aria-label="Utility" className="hidden items-center gap-5 sm:flex">
            {utilityLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-gray-300 hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <Container>
          <div className="flex h-16 items-center gap-2 sm:gap-4 lg:h-[72px]">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className={cn(iconButton, '-ml-2 md:hidden')}
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <Logo className="mr-1" />
            <SearchBar className="mx-2 hidden max-w-2xl flex-1 md:block lg:mx-6" />
            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <AccountMenu />
              <button type="button" aria-label="Wishlist" className={cn(iconButton, 'hidden sm:inline-flex')}>
                <HeartIcon className="h-[22px] w-[22px]" />
              </button>
              <button type="button" aria-label="Cart" className={iconButton}>
                <CartIcon className="h-[22px] w-[22px]" />
              </button>
            </div>
          </div>
          <div className="pb-3 md:hidden">
            <SearchBar />
          </div>
        </Container>

        <div className="hidden border-t border-line md:block">
          <Container>
            <nav aria-label="Primary" className="-mx-1 flex h-11 items-center gap-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className={cn(textStyles.nav, 'inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 font-semibold hover:bg-surface-muted')}
              >
                <GridIcon className="h-4 w-4" />
                All categories
              </button>
              <span className="mx-1 h-4 w-px shrink-0 bg-line-strong" aria-hidden="true" />
              {presentationCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={category.href}
                  className={cn(
                    textStyles.nav,
                    'shrink-0 rounded-md px-2 py-1.5 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink',
                  )}
                >
                  {category.name}
                </Link>
              ))}
              <Link
                href={PLACEHOLDER_HREF}
                className={cn(
                  textStyles.nav,
                  'ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold text-accent-600 hover:bg-accent-50',
                )}
              >
                <TagIcon className="h-4 w-4" />
                Today&apos;s deals
              </Link>
            </nav>
          </Container>
        </div>
      </header>

      <MobileNav open={menuOpen} onClose={closeMenu} categories={presentationCategories} />
    </>
  );
}
