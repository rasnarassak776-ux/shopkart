import React from 'react';
import { cn } from '@/lib/cn';
import { textStyles } from '@/design-system/text-styles';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return inr.format(amount);
}

export function discountPercent(price: number, compareAt?: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

interface PriceProps {
  amount: number;
  compareAt?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { price: 'text-sm', compare: 'text-xs' },
  md: { price: 'text-base sm:text-lg', compare: 'text-xs sm:text-sm' },
  lg: { price: 'text-2xl', compare: 'text-base' },
} as const;

export function Price({ amount, compareAt, size = 'md', className }: PriceProps) {
  const discount = discountPercent(amount, compareAt);
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn(textStyles.price, sizeClasses[size].price)}>
        <span className="sr-only">Price: </span>
        {formatPrice(amount)}
      </span>
      {discount > 0 && compareAt && (
        <>
          <span className={cn(textStyles.priceCompare, sizeClasses[size].compare)}>
            <span className="sr-only">Original price: </span>
            {formatPrice(compareAt)}
          </span>
          <span className={cn('font-semibold text-success', sizeClasses[size].compare)}>{discount}% off</span>
        </>
      )}
    </div>
  );
}
