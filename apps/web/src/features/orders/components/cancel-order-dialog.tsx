'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { cancelOrder } from '../orders-api';
import {
  CANCELLATION_REASONS,
  type CancellationReason,
  type Order,
} from '../types';

interface CancelOrderDialogProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onCancelled: (order: Order) => void;
}

export function CancelOrderDialog({
  order,
  open,
  onClose,
  onCancelled,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setComment('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      const updated = await cancelOrder(order.id, {
        reason,
        comment: comment.trim() || undefined,
      });
      onCancelled(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cancel-order-title" className="text-lg font-bold text-ink">
          Cancel Order
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Are you sure you want to cancel order{' '}
          <span className="font-mono font-semibold text-ink">
            #{order.id.slice(0, 8)}
          </span>
          ? Reserved stock will be released and any paid amount will be queued
          for refund.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-xs font-semibold text-ink mb-1"
            >
              Cancellation Reason *
            </label>
            <select
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as CancellationReason)}
              required
              className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink shadow-xs focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            >
              <option value="" disabled>
                Select a reason...
              </option>
              {CANCELLATION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cancel-comment"
              className="block text-xs font-semibold text-ink mb-1"
            >
              Additional Comment (Optional)
            </label>
            <textarea
              id="cancel-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell us more about why you are cancelling..."
              className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted shadow-xs focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              ✕ {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="font-semibold"
            >
              Keep Order
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!reason || submitting}
              className={cn('font-semibold')}
            >
              {submitting ? 'Cancelling...' : 'Yes, Cancel Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
