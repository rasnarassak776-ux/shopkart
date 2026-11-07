import React from 'react';
import { cn } from '@/lib/cn';

export const fieldClasses = (invalid?: boolean) =>
  cn(
    'block w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-card placeholder:text-ink-muted transition-colors',
    'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted',
    invalid
      ? 'border-danger focus:border-danger focus:ring-danger/20'
      : 'border-line-strong focus:border-accent-600 focus:ring-accent-600/20',
  );

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('block text-sm font-medium text-ink', className)} {...props} />;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...props },
  ref,
) {
  return (
    <input ref={ref} aria-invalid={invalid || undefined} className={cn(fieldClasses(invalid), className)} {...props} />
  );
});

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1.5 text-xs text-ink-muted', className)} {...props} />;
}

export function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p role="alert" className={cn('mt-1.5 text-xs font-medium text-danger', className)} {...props} />;
}
