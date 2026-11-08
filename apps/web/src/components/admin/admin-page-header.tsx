import React from 'react';
import { cn } from '@/lib/cn';

interface AdminPageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
