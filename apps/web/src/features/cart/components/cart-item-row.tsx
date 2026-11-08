'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Badge,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  SpinnerIcon,
  ShoppingBagIcon,
  AlertCircleIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { presentationFeaturedProducts } from '@/features/storefront/presentation-data';
import type { CartItem } from '../types';

interface CartItemRowProps {
  item: CartItem;
  isUpdating: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<any>;
  onRemove: (itemId: string) => Promise<any>;
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function CartItemRow({
  item,
  isUpdating,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps) {
  const [imgError, setImgError] = useState(false);

  const handleDecrement = () => {
    if (item.quantity > 1 && !isUpdating && item.available) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (item.quantity < 99 && !isUpdating && item.available) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 99 && val !== item.quantity && item.available) {
      onUpdateQuantity(item.id, val);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 transition-colors sm:flex-row sm:items-center sm:gap-6 sm:p-5',
        !item.available && 'border-warning/40 bg-warning/5',
      )}
    >
      {/* Product Image */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-muted border border-line/60 sm:h-28 sm:w-28">
        {(item.imageUrl || presentationFeaturedProducts.find((p) => p.id === item.productId)?.image?.src) && !imgError ? (
          <Image
            src={(item.imageUrl || presentationFeaturedProducts.find((p) => p.id === item.productId)?.image?.src)!}
            alt={item.name}
            fill
            sizes="112px"
            onError={() => setImgError(true)}
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-muted">
            <ShoppingBagIcon className="h-8 w-8 stroke-[1.5]" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between self-stretch">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={cn(textStyles.productTitle, 'text-base font-semibold')}>
              <Link
                href={`/products/${item.productId}`}
                className="hover:text-accent-600 hover:underline hover:underline-offset-2 transition-colors"
              >
                {item.name}
              </Link>
            </h3>

            {/* Availability Badge */}
            {!item.available && (
              <Badge variant="warning" className="shrink-0 flex items-center gap-1">
                <AlertCircleIcon className="h-3.5 w-3.5" />
                Unavailable
              </Badge>
            )}
          </div>

          {!item.available ? (
            <p className={cn(textStyles.bodySm, 'mt-1 text-warning font-medium')}>
              This product is currently out of catalog or discontinued. Please remove it to proceed.
            </p>
          ) : (
            <p className={cn(textStyles.bodySm, 'mt-1 text-ink-muted')}>
              Unit price: <span className="font-semibold text-ink">{formatCurrency(item.unitPrice)}</span>
            </p>
          )}
        </div>

        {/* Controls row (Mobile stacked, Desktop aligned) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-line/60 sm:border-0 sm:pt-0">
          {/* Quantity Controls */}
          <div className="flex items-center gap-1.5">
            <span className="sr-only">Quantity controls for {item.name}</span>
            <div className="inline-flex items-center rounded-lg border border-line bg-surface shadow-sm">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={item.quantity <= 1 || isUpdating || !item.available}
                aria-label={`Decrease quantity of ${item.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-l-lg text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
              >
                <MinusIcon className="h-4 w-4" />
              </button>

              <div className="relative flex h-9 w-12 items-center justify-center border-x border-line">
                {isUpdating ? (
                  <SpinnerIcon className="h-4 w-4 text-accent-600" />
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={handleInputChange}
                    disabled={isUpdating || !item.available}
                    aria-label={`Quantity for ${item.name}`}
                    className="h-full w-full bg-transparent text-center text-sm font-semibold text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={item.quantity >= 99 || isUpdating || !item.available}
                aria-label={`Increase quantity of ${item.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Remove Action */}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={isUpdating}
              aria-label={`Remove ${item.name} from cart`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600 ml-2"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>

          {/* Line Total */}
          <div className="text-right">
            <span className="text-xs text-ink-muted block sm:inline mr-1">Total:</span>
            <span
              className={cn(
                'font-display text-base sm:text-lg font-bold',
                item.available ? 'text-ink' : 'text-ink-muted line-through',
              )}
            >
              {formatCurrency(item.lineTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
