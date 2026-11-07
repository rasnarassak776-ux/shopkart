import React from 'react';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { ProductSpec } from './types';

interface ProductSpecificationsProps {
  specifications: ProductSpec[];
}

export function ProductSpecifications({ specifications }: ProductSpecificationsProps) {
  if (specifications.length === 0) return null;

  return (
    <section aria-labelledby="product-specifications-heading">
      <h2 id="product-specifications-heading" className={cn(textStyles.h3, 'mb-3')}>
        Product details
      </h2>
      <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
        {specifications.map((spec) => (
          <div
            key={spec.label}
            className="grid grid-cols-[7rem_1fr] gap-4 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:px-5"
          >
            <dt className={cn(textStyles.bodySm, 'font-medium text-ink')}>{spec.label}</dt>
            <dd className={cn(textStyles.bodySm, 'text-ink-secondary')}>{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
