import React from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'neutral' | 'accent' | 'sale' | 'dark' | 'success' | 'warning' | 'danger';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-ink-secondary ring-1 ring-inset ring-line',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200',
  sale: 'bg-accent-600 text-white',
  dark: 'bg-primary text-white',
  success: 'bg-success-soft text-success ring-1 ring-inset ring-success/20',
  warning: 'bg-warning-soft text-warning ring-1 ring-inset ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-1 ring-inset ring-danger/20',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
