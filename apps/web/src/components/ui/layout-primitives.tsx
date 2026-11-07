import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { textStyles } from '@/design-system/text-styles';
import { ArrowRightIcon } from './icons';

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8', className)} {...props} />;
}

interface SectionHeadingProps {
  id?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function SectionHeading({ id, title, description, action }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        <h2 id={id} className={textStyles.h2}>
          {title}
        </h2>
        {description && <p className={cn(textStyles.bodySm, 'mt-1.5')}>{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 font-display text-sm font-semibold text-ink hover:text-accent-600"
        >
          {action.label}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
