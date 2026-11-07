'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { CheckIcon, AlertCircleIcon, CloseIcon } from './icons';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const typeConfig: Record<
    ToastType,
    { icon: React.ReactNode; bg: string; border: string; text: string }
  > = {
    success: {
      icon: <CheckIcon className="h-5 w-5 text-success" />,
      bg: 'bg-surface',
      border: 'border-success/30',
      text: 'text-ink',
    },
    error: {
      icon: <AlertCircleIcon className="h-5 w-5 text-danger" />,
      bg: 'bg-surface',
      border: 'border-danger/30',
      text: 'text-ink',
    },
    info: {
      icon: <AlertCircleIcon className="h-5 w-5 text-accent-600" />,
      bg: 'bg-surface',
      border: 'border-accent-600/30',
      text: 'text-ink',
    },
  };

  const { icon, bg, border, text } = typeConfig[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-raised transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
        bg,
        border,
        text,
      )}
    >
      <div className="shrink-0 pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
        )}
        <p className="text-sm text-ink-secondary break-words">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
