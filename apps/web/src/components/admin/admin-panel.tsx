import React from 'react';
import { AlertCircleIcon, Button, type IconProps } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Rounded card surface used throughout the admin console. */
export function AdminPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-line bg-surface shadow-card', className)} {...props} />;
}

interface AdminNoticeProps {
  icon: (props: IconProps) => React.ReactElement;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Empty / unavailable / coming-soon state. */
export function AdminNotice({ icon: Icon, title, description, action, className }: AdminNoticeProps) {
  return (
    <AdminPanel className={cn('flex flex-col items-center px-6 py-12 text-center sm:py-16', className)}>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">{description}</div>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </AdminPanel>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-danger/20 bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5 text-sm text-danger">
        <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0">
          Try again
        </Button>
      )}
    </div>
  );
}
