import React from 'react';
import { AlertCircleIcon, Skeleton, type IconProps } from '@/components/ui';
import { cn } from '@/lib/cn';

export type AdminStatStatus = 'loading' | 'ready' | 'unavailable';

interface AdminStatCardProps {
  label: string;
  value?: number | null;
  status: AdminStatStatus;
  icon: (props: IconProps) => React.ReactElement;
  hint?: React.ReactNode;
  tone?: 'accent' | 'success' | 'neutral' | 'warning';
}

const toneClasses: Record<NonNullable<AdminStatCardProps['tone']>, string> = {
  accent: 'bg-accent-50 text-accent-600',
  success: 'bg-success-soft text-success',
  neutral: 'bg-surface-muted text-ink-secondary',
  warning: 'bg-warning-soft text-warning',
};

const numberFormat = new Intl.NumberFormat('en-IN');

/** Summary metric card. Never renders a number unless real data is available. */
export function AdminStatCard({ label, value, status, icon: Icon, hint, tone = 'accent' }: AdminStatCardProps) {
  const hasValue = status === 'ready' && typeof value === 'number';

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card" aria-busy={status === 'loading'}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-secondary">{label}</p>
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-2 min-h-[2.5rem]">
        {status === 'loading' && <Skeleton className="h-9 w-20" />}
        {hasValue && (
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight text-ink">
            {numberFormat.format(value)}
          </p>
        )}
        {!hasValue && status !== 'loading' && (
          <p className="flex items-center gap-1.5 pt-2 text-sm font-medium text-ink-muted">
            <AlertCircleIcon className="h-4 w-4" />
            Data unavailable
          </p>
        )}
      </div>
      {hint && hasValue && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
