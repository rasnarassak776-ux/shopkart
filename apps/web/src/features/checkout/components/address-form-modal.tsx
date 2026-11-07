'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Label,
  FieldError,
  CloseIcon,
  SpinnerIcon,
} from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { AddressFormData, CheckoutAddress } from '../types';

interface AddressFormModalProps {
  isOpen: boolean;
  editingAddress: CheckoutAddress | null;
  onClose: () => void;
  onSave: (data: AddressFormData) => Promise<{ success: boolean; error?: string }>;
}

const emptyFormData: AddressFormData = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
};

export function AddressFormModal({
  isOpen,
  editingAddress,
  onClose,
  onSave,
}: AddressFormModalProps) {
  const [formData, setFormData] = useState<AddressFormData>(emptyFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAddress) {
      setFormData({
        fullName: editingAddress.fullName,
        phone: editingAddress.phone,
        addressLine1: editingAddress.addressLine1,
        addressLine2: editingAddress.addressLine2 || '',
        city: editingAddress.city,
        state: editingAddress.state,
        postalCode: editingAddress.postalCode,
        country: editingAddress.country || 'India',
        isDefault: editingAddress.isDefault,
      });
    } else {
      setFormData(emptyFormData);
    }
    setErrors({});
    setFormError(null);
  }, [editingAddress, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap / initial focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initialFocusRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errs.fullName = 'Full name is required.';
    } else if (formData.fullName.trim().length > 120) {
      errs.fullName = 'Full name must not exceed 120 characters.';
    }

    const phoneClean = formData.phone.trim();
    if (!phoneClean) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(phoneClean)) {
      errs.phone = 'Please enter a valid phone number (7 to 20 digits).';
    }

    if (!formData.addressLine1.trim()) {
      errs.addressLine1 = 'Address line 1 is required.';
    } else if (formData.addressLine1.trim().length > 255) {
      errs.addressLine1 = 'Address line 1 must not exceed 255 characters.';
    }

    if (formData.addressLine2 && formData.addressLine2.trim().length > 255) {
      errs.addressLine2 = 'Address line 2 must not exceed 255 characters.';
    }

    if (!formData.city.trim()) {
      errs.city = 'City is required.';
    } else if (formData.city.trim().length > 100) {
      errs.city = 'City must not exceed 100 characters.';
    }

    if (!formData.state.trim()) {
      errs.state = 'State is required.';
    } else if (formData.state.trim().length > 100) {
      errs.state = 'State must not exceed 100 characters.';
    }

    if (!formData.postalCode.trim()) {
      errs.postalCode = 'Postal code is required.';
    } else if (formData.postalCode.trim().length > 15) {
      errs.postalCode = 'Postal code must not exceed 15 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await onSave({
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      addressLine1: formData.addressLine1.trim(),
      addressLine2: formData.addressLine2?.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      postalCode: formData.postalCode.trim(),
      country: formData.country.trim() || 'India',
      isDefault: formData.isDefault,
    });

    setIsSubmitting(false);
    if (!result.success) {
      setFormError(result.error || 'Failed to save address. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <h2 id="address-dialog-title" className={cn(textStyles.h3, 'text-ink')}>
            {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close address dialog"
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
          >
            {formError}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <Label htmlFor="address-fullName">Full Name *</Label>
              <Input
                ref={initialFocusRef}
                id="address-fullName"
                name="fullName"
                value={formData.fullName}
                invalid={Boolean(errors.fullName)}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. John Doe"
                className="mt-1"
              />
              {errors.fullName && <FieldError>{errors.fullName}</FieldError>}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="address-phone">Phone Number *</Label>
              <Input
                id="address-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                invalid={Boolean(errors.phone)}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="mt-1"
              />
              {errors.phone && <FieldError>{errors.phone}</FieldError>}
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <Label htmlFor="address-line1">Address Line 1 *</Label>
            <Input
              id="address-line1"
              name="addressLine1"
              value={formData.addressLine1}
              invalid={Boolean(errors.addressLine1)}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              placeholder="House/Flat number, building name, street"
              className="mt-1"
            />
            {errors.addressLine1 && <FieldError>{errors.addressLine1}</FieldError>}
          </div>

          {/* Address Line 2 */}
          <div>
            <Label htmlFor="address-line2">Address Line 2 (Optional)</Label>
            <Input
              id="address-line2"
              name="addressLine2"
              value={formData.addressLine2 || ''}
              invalid={Boolean(errors.addressLine2)}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              placeholder="Apartment, suite, landmark, floor"
              className="mt-1"
            />
            {errors.addressLine2 && <FieldError>{errors.addressLine2}</FieldError>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* City */}
            <div>
              <Label htmlFor="address-city">City *</Label>
              <Input
                id="address-city"
                name="city"
                value={formData.city}
                invalid={Boolean(errors.city)}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="mt-1"
              />
              {errors.city && <FieldError>{errors.city}</FieldError>}
            </div>

            {/* State */}
            <div>
              <Label htmlFor="address-state">State *</Label>
              <Input
                id="address-state"
                name="state"
                value={formData.state}
                invalid={Boolean(errors.state)}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="mt-1"
              />
              {errors.state && <FieldError>{errors.state}</FieldError>}
            </div>

            {/* Postal Code */}
            <div>
              <Label htmlFor="address-postalCode">Postal Code *</Label>
              <Input
                id="address-postalCode"
                name="postalCode"
                value={formData.postalCode}
                invalid={Boolean(errors.postalCode)}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Postal code"
                className="mt-1"
              />
              {errors.postalCode && <FieldError>{errors.postalCode}</FieldError>}
            </div>
          </div>

          {/* Country */}
          <div>
            <Label htmlFor="address-country">Country</Label>
            <Input
              id="address-country"
              name="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Default Address Checkbox */}
          <div className="pt-2 flex items-center gap-2.5">
            <input
              id="address-isDefault"
              name="isDefault"
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-line-strong text-accent-600 focus:ring-accent-600/30"
            />
            <label htmlFor="address-isDefault" className="text-sm font-medium text-ink cursor-pointer">
              Set as default delivery address
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : editingAddress ? (
                'Update Address'
              ) : (
                'Save Address'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
