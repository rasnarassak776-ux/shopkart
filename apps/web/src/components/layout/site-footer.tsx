import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { PLACEHOLDER_HREF } from '@/features/storefront/presentation-data';
import { Logo } from './logo';
import { NewsletterForm } from './newsletter-form';

const columns = [
  {
    title: 'Shop',
    links: ['Electronics', 'Fashion', 'Home & Living', 'Beauty', "Today's deals"],
  },
  {
    title: 'Customer care',
    links: ['Help centre', 'Track your order', 'Returns & refunds', 'Shipping information'],
  },
  {
    title: 'Company',
    links: ['About Shopkart', 'Careers', 'Sell on Shopkart', 'Press'],
  },
];

const paymentMethods = ['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net banking', 'COD'];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary text-gray-300 sm:mt-24">
      <Container>
        <div className="flex flex-col gap-6 border-b border-white/10 py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-bold text-white">Get members-only deals</h2>
            <p className="mt-1.5 text-sm text-gray-400">
              New arrivals, exclusive offers and style notes — straight to your inbox.
            </p>
          </div>
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo inverse />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
              Thoughtfully curated essentials across fashion, home, beauty and tech — delivered across India.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className={`${textStyles.eyebrow} text-white`}>{column.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((label) => (
                  <li key={label}>
                    <Link href={PLACEHOLDER_HREF} className="text-gray-400 transition-colors hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Shopkart. All rights reserved.</p>
          <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
            {paymentMethods.map((method) => (
              <li key={method} className="rounded-md border border-white/15 px-2 py-1 font-medium text-gray-300">
                {method}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
