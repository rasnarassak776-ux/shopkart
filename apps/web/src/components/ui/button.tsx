import React from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'accent' | 'primary' | 'secondary' | 'ghost' | 'inverse' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-display font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
  accent: 'bg-accent-600 text-white shadow-card hover:bg-accent-700',
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-muted',
  ghost: 'text-ink hover:bg-surface-muted',
  inverse: 'bg-white text-ink shadow-card hover:bg-gray-100',
  link: 'rounded-sm p-0 text-accent-600 underline-offset-4 hover:text-accent-700 hover:underline',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Shared button classes, also used to style `<Link>` elements as buttons. */
export function buttonClasses({
  variant = 'accent',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(base, variants[variant], variant !== 'link' && sizes[size], fullWidth && 'w-full', className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<ButtonStyleOptions, 'className'> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    />
  );
});
