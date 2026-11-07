'use client';

import React from 'react';
import {
  Button,
  MapPinIcon,
  PlusIcon,
  AlertCircleIcon,
  Skeleton,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { useCheckout } from '../checkout-context';
import { AddressSelectionCard } from './address-selection-card';
import { AddressFormModal } from './address-form-modal';

export function DeliveryAddressSection() {
  const {
    addresses,
    isLoadingAddresses,
    addressError,
    selectedAddressId,
    selectAddress,
    refreshAddresses,
    isAddressModalOpen,
    editingAddress,
    openAddAddressModal,
    openEditAddressModal,
    closeAddressModal,
    saveAddress,
  } = useCheckout();

  return (
    <section
      aria-labelledby="delivery-address-heading"
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-card space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <MapPinIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 id="delivery-address-heading" className={cn(textStyles.h3, 'text-ink')}>
              1. Delivery Address
            </h2>
            <p className={cn(textStyles.bodySm, 'text-ink-muted')}>
              Select the address where you want your order delivered.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={openAddAddressModal}
          className="self-start sm:self-auto shrink-0"
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Add New Address
        </Button>
      </div>

      {/* Loading Skeleton */}
      {isLoadingAddresses && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {/* Error Banner */}
      {!isLoadingAddresses && addressError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          <AlertCircleIcon className="h-5 w-5 shrink-0 text-danger mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{addressError}</p>
            <button
              type="button"
              onClick={refreshAddresses}
              className="mt-2 text-xs font-bold underline hover:opacity-80"
            >
              Try loading addresses again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingAddresses && !addressError && addresses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong p-8 text-center bg-surface-muted/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-3">
            <MapPinIcon className="h-6 w-6" />
          </div>
          <h3 className={cn(textStyles.h3, 'text-ink')}>No saved addresses</h3>
          <p className={cn(textStyles.bodySm, 'mt-1 max-w-sm text-ink-muted')}>
            You do not have any saved delivery addresses yet. Please add a shipping destination to continue with checkout.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openAddAddressModal}
            className="mt-4"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Add Delivery Address
          </Button>
        </div>
      )}

      {/* Address Selection Radio Group */}
      {!isLoadingAddresses && !addressError && addresses.length > 0 && (
        <div
          role="radiogroup"
          aria-labelledby="delivery-address-heading"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {addresses.map((addr) => (
            <AddressSelectionCard
              key={addr.id}
              address={addr}
              isSelected={selectedAddressId === addr.id}
              onSelect={selectAddress}
              onEdit={openEditAddressModal}
            />
          ))}
        </div>
      )}

      {/* Address Create/Edit Modal Dialog */}
      <AddressFormModal
        isOpen={isAddressModalOpen}
        editingAddress={editingAddress}
        onClose={closeAddressModal}
        onSave={saveAddress}
      />
    </section>
  );
}
