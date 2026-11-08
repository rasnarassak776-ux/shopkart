'use client';

import React from 'react';
import { Badge, Button, PencilIcon, CheckIcon } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CheckoutAddress } from '../types';

interface AddressSelectionCardProps {
  address: CheckoutAddress;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (address: CheckoutAddress) => void;
}

export function AddressSelectionCard({
  address,
  isSelected,
  onSelect,
  onEdit,
}: AddressSelectionCardProps) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(address.id)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(address.id);
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
        {/* Header: Radio circle, Name, Badges */}
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
            <div>
              <span className="font-semibold text-ink text-sm sm:text-base">
                {address.fullName}
              </span>
              <span className="ml-2 text-xs sm:text-sm font-medium text-ink-secondary">
                {address.phone}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {address.isDefault && (
              <Badge variant="dark" className="text-[10px] uppercase font-bold tracking-wider">
                Default
              </Badge>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(address);
              }}
              aria-label={`Edit address for ${address.fullName}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Address Lines */}
        <div className="pl-8 text-xs sm:text-sm text-ink-secondary space-y-0.5">
          <p>{address.addressLine1}</p>
          {address.addressLine2 && <p>{address.addressLine2}</p>}
          <p>
            {address.city}, {address.state} – <span className="font-semibold text-ink">{address.postalCode}</span>
          </p>
          <p className="text-ink-muted">{address.country || 'India'}</p>
        </div>
      </div>
    </div>
  );
}
