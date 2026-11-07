'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface UserAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt?: string;
}

interface AddressFormData {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const initialFormData: AddressFormData = {
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

export function AddressManager() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form & Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load addresses
  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<UserAddress[]>('/api/v1/users/me/addresses');
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage('Failed to load saved addresses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Open Add Modal
  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      ...initialFormData,
      fullName: user?.name || '',
      phone: user?.phone || '',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowForm(true);
  };

  // Open Edit Modal
  const handleEdit = (address: UserAddress) => {
    setEditingId(address.id);
    setFormData({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country || 'India',
      isDefault: address.isDefault,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowForm(true);
  };

  // Cancel Form
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client Validation
    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.phone.trim() || !/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone.trim())) {
      setErrorMessage('Valid phone number is required (7–20 digits).');
      return;
    }
    if (!formData.addressLine1.trim()) {
      setErrorMessage('Address Line 1 is required.');
      return;
    }
    if (!formData.city.trim()) {
      setErrorMessage('City is required.');
      return;
    }
    if (!formData.state.trim()) {
      setErrorMessage('State is required.');
      return;
    }
    if (!formData.postalCode.trim()) {
      setErrorMessage('Postal code is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || undefined,
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim() || 'India',
        isDefault: formData.isDefault,
      };

      if (editingId) {
        await apiClient(`/api/v1/users/me/addresses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMessage('Address updated successfully.');
      } else {
        await apiClient('/api/v1/users/me/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMessage('New address added successfully.');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
      await loadAddresses();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save address. Please check input fields.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Default
  const handleSetDefault = async (addressId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await apiClient(`/api/v1/users/me/addresses/${addressId}/default`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      setSuccessMessage('Default address updated.');
      await loadAddresses();
    } catch (err: any) {
      setErrorMessage('Failed to update default address.');
    }
  };

  // Delete Address
  const handleDelete = async (addressId: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    setDeletingId(addressId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await apiClient(`/api/v1/users/me/addresses/${addressId}`, {
        method: 'DELETE',
      });
      setSuccessMessage('Address deleted successfully.');
      await loadAddresses();
    } catch (err: any) {
      setErrorMessage('Failed to delete address.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
            <span className="inline-flex items-center rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
              Address Book ({addresses.length})
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage your delivery and billing addresses for fast and seamless checkout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/customer/dashboard"
            className="text-sm font-semibold text-accent-600 hover:text-accent-700"
          >
            ← Back to Dashboard
          </Link>
          {!showForm && (
            <button
              onClick={handleAddNew}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
            >
              + Add New Address
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* Add / Edit Form Modal / Panel */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
            {editingId ? 'Edit Address' : 'Add New Address'}
          </h2>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  placeholder="Recipient Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  placeholder="+91 9876543210"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                placeholder="Street address, P.O. box, company name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address Line 2 <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                placeholder="Apartment, suite, unit, building, floor"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  placeholder="City / Town"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">State / Region *</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  placeholder="State"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Postal Code *</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  placeholder="PIN / Postal Code"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  placeholder="Country"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 font-medium">
                    Set as default shipping address
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Saving Address...' : editingId ? 'Update Address' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address List Display */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-600 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">Loading addresses...</span>
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No saved addresses</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            You haven&apos;t added any delivery addresses yet. Add one now to use during checkout.
          </p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-700"
          >
            + Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-xl p-6 shadow-sm border relative transition-all ${
                address.isDefault
                  ? 'border-accent-600 ring-2 ring-accent-600/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start pb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">{address.fullName}</h3>
                  {address.isDefault && (
                    <span className="inline-flex items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-600/20">
                      Default Address
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-600 space-y-1">
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}, {address.state} – {address.postalCode}
                </p>
                <p>{address.country}</p>
                <p className="pt-2 font-medium text-gray-800">Phone: {address.phone}</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="text-xs font-medium text-accent-600 hover:text-accent-700 underline"
                    >
                      Set as default
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEdit(address)}
                    className="text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    Edit
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                  >
                    {deletingId === address.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
