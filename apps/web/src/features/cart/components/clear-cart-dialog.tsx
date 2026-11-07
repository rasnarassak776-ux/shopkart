'use client';

import React, { useEffect, useRef } from 'react';
import { Button, AlertCircleIcon, CloseIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

interface ClearCartDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isClearing?: boolean;
}

export function ClearCartDialog({
  open,
  onClose,
  onConfirm,
  isClearing = false,
}: ClearCartDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClearing) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isClearing]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="clear-cart-title"
      aria-describedby="clear-cart-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isClearing) onClose();
        }}
        aria-hidden="true"
      />

      {/* Dialog content */}
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-overlay animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertCircleIcon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="clear-cart-title" className={cn(textStyles.h3, 'text-ink')}>
              Clear shopping cart?
            </h3>
            <p id="clear-cart-desc" className={cn(textStyles.bodySm, 'mt-2 text-ink-secondary')}>
              Are you sure you want to remove all items from your shopping cart? This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isClearing}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-50"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isClearing}
          >
            Cancel
          </Button>
          <Button
            ref={confirmButtonRef}
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={isClearing}
            className="bg-danger hover:bg-danger/90 focus-visible:outline-danger text-white"
          >
            {isClearing ? 'Clearing...' : 'Clear cart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
