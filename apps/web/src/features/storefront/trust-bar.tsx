import React from 'react';
import { ReturnIcon, ShieldIcon, SupportIcon, TruckIcon } from '@/components/ui';

const items = [
  { icon: TruckIcon, title: 'Free delivery', description: 'On orders above ₹499' },
  { icon: ReturnIcon, title: 'Easy returns', description: '7-day hassle-free returns' },
  { icon: ShieldIcon, title: 'Secure payments', description: 'Encrypted checkout' },
  { icon: SupportIcon, title: 'Here to help', description: 'Support, 7 days a week' },
];

export function TrustBar() {
  return (
    <section aria-label="Why shop with Shopkart" className="rounded-2xl border border-line bg-surface">
      <ul className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {items.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600 sm:h-10 sm:w-10">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-ink">{title}</p>
              <p className="hidden text-xs text-ink-muted sm:block">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
