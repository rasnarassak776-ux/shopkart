'use client';

import React from 'react';
import {
  CreditCardIcon,
  BanknotesIcon,
  CheckIcon,
  Badge,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { useCheckout } from '../checkout-context';
import type { PaymentMethod } from '../types';

export function PaymentMethodSection() {
  const {
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentOptions,
  } = useCheckout();

  return (
    <section
      aria-labelledby="payment-method-heading"
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
          <CreditCardIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 id="payment-method-heading" className={cn(textStyles.h3, 'text-ink')}>
            2. Payment Method
          </h2>
          <p className={cn(textStyles.bodySm, 'text-ink-muted')}>
            Choose how you would like to pay for your order.
          </p>
        </div>
      </div>

      {/* Payment Options Radio Group */}
      <div
        role="radiogroup"
        aria-labelledby="payment-method-heading"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {paymentOptions.map((option) => {
          const isSelected = selectedPaymentMethod === option.id;

          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => setSelectedPaymentMethod(option.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setSelectedPaymentMethod(option.id);
                }
              }}
              className={cn(
                'relative flex flex-col justify-between rounded-xl border p-4 sm:p-5 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600',
                isSelected
                  ? 'border-accent-600 bg-accent-50/20 ring-1 ring-accent-600 shadow-sm'
                  : 'border-line bg-surface hover:border-line-strong hover:shadow-card',
              )}
            >
              <div className="space-y-3">
                {/* Header with Radio circle & Icon */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isSelected
                          ? 'border-accent-600 bg-accent-600 text-white'
                          : 'border-line-strong bg-surface',
                      )}
                    >
                      {isSelected && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {option.id === 'COD' ? (
                        <BanknotesIcon className="h-5 w-5 text-accent-700" />
                      ) : (
                        <CreditCardIcon className="h-5 w-5 text-accent-700" />
                      )}
                      <span className="font-semibold text-ink text-sm sm:text-base">
                        {option.name}
                      </span>
                    </div>
                  </div>

                  {option.badge && (
                    <Badge
                      variant={option.badgeVariant || 'accent'}
                      className="text-[10px] uppercase font-bold tracking-wider shrink-0"
                    >
                      {option.badge}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="pl-8 text-xs sm:text-sm text-ink-secondary">
                  {option.description}
                </p>

                {/* Unavailable / Info notice */}
                {option.unavailableReason && (
                  <div className="ml-8 mt-2 rounded-lg bg-surface-muted/60 p-2.5 text-xs text-ink-muted border border-line">
                    <p>{option.unavailableReason}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
