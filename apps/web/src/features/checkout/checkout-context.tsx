'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/features/cart';
import { ApiError } from '@/lib/api-client';
import {
  listAddresses,
  createAddress,
  updateAddress,
} from './checkout-api';
import type {
  CheckoutAddress,
  AddressFormData,
  PaymentMethod,
  PaymentOption,
  CheckoutValidationState,
} from './types';

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'COD',
    name: 'Cash on Delivery (COD)',
    description: 'Pay cash or UPI upon delivery at your doorstep.',
    badge: 'Fastest',
    badgeVariant: 'accent',
    isAvailable: true,
  },
  {
    id: 'ONLINE',
    name: 'Online Payment (Card / UPI / NetBanking)',
    description: 'Secure digital checkout via UPI, Debit/Credit Card or NetBanking.',
    badge: 'Available in Phase 5',
    badgeVariant: 'neutral',
    isAvailable: true,
    unavailableReason: 'Gateway processing will be connected during order placement (Phase 5).',
  },
];

interface CheckoutContextValue {
  // Address State
  addresses: CheckoutAddress[];
  isLoadingAddresses: boolean;
  addressError: string | null;
  selectedAddressId: string | null;
  selectedAddress: CheckoutAddress | null;
  selectAddress: (id: string) => void;
  refreshAddresses: () => Promise<void>;

  // Address Modal / Form State
  isAddressModalOpen: boolean;
  editingAddress: CheckoutAddress | null;
  openAddAddressModal: () => void;
  openEditAddressModal: (address: CheckoutAddress) => void;
  closeAddressModal: () => void;
  saveAddress: (data: AddressFormData) => Promise<{ success: boolean; error?: string }>;

  // Payment Method State
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (method: PaymentMethod) => void;
  paymentOptions: PaymentOption[];

  // Validation State
  validation: CheckoutValidationState;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { cart, isLoading: cartLoading, hasUnavailableItems, isEmpty } = useCart();

  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CheckoutAddress | null>(null);

  // Payment Method State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('COD');

  // Track user for multi-user isolation
  const previousUserIdRef = useRef<string | null>(null);

  // Load addresses from Auth Service
  const loadAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setAddresses([]);
      setSelectedAddressId(null);
      setIsLoadingAddresses(false);
      return;
    }

    setIsLoadingAddresses(true);
    setAddressError(null);

    try {
      const data = await listAddresses();
      setAddresses(data);

      // Auto-select address logic:
      // 1. Keep currently selected if it exists in the fetched list
      // 2. Or pick the default address (isDefault: true)
      // 3. Or pick the first address
      setSelectedAddressId((prevId) => {
        if (prevId && data.some((addr) => addr.id === prevId)) {
          return prevId;
        }
        const defaultAddr = data.find((addr) => addr.isDefault);
        if (defaultAddr) return defaultAddr.id;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err: any) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Unable to load delivery addresses. Please try again.';
      setAddressError(message);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [isAuthenticated]);

  // Handle user authentication transitions
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id || null;
    if (previousUserIdRef.current !== currentUserId) {
      // User switched or logged out
      setAddresses([]);
      setSelectedAddressId(null);
      setSelectedPaymentMethod('COD');
      setIsAddressModalOpen(false);
      setEditingAddress(null);
      setAddressError(null);
      previousUserIdRef.current = currentUserId;
    }

    if (isAuthenticated) {
      loadAddresses();
    } else {
      setIsLoadingAddresses(false);
    }
  }, [authLoading, isAuthenticated, user?.id, loadAddresses]);

  // Derived selected address object
  const selectedAddress = useMemo(() => {
    if (!selectedAddressId) return null;
    return addresses.find((addr) => addr.id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  // Modal helpers
  const openAddAddressModal = useCallback(() => {
    setEditingAddress(null);
    setIsAddressModalOpen(true);
  }, []);

  const openEditAddressModal = useCallback((address: CheckoutAddress) => {
    setEditingAddress(address);
    setIsAddressModalOpen(true);
  }, []);

  const closeAddressModal = useCallback(() => {
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  }, []);

  // Save address (Create or Update)
  const saveAddress = useCallback(
    async (formData: AddressFormData): Promise<{ success: boolean; error?: string }> => {
      try {
        if (editingAddress) {
          const updated = await updateAddress(editingAddress.id, formData);
          setAddresses((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a)),
          );
          if (formData.isDefault) {
            // Unset default on other addresses in state
            setAddresses((prev) =>
              prev.map((a) =>
                a.id === updated.id ? updated : { ...a, isDefault: false },
              ),
            );
          }
          if (selectedAddressId === editingAddress.id) {
            setSelectedAddressId(updated.id);
          }
        } else {
          const created = await createAddress(formData);
          setAddresses((prev) => {
            const list = formData.isDefault
              ? prev.map((a) => ({ ...a, isDefault: false }))
              : [...prev];
            return [created, ...list];
          });
          // Automatically select newly created address
          setSelectedAddressId(created.id);
        }

        closeAddressModal();
        return { success: true };
      } catch (err: any) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to save delivery address.';
        return { success: false, error: message };
      }
    },
    [editingAddress, selectedAddressId, closeAddressModal],
  );

  // Compute checkout validation state
  const validation = useMemo<CheckoutValidationState>(() => {
    const errors: string[] = [];

    if (!isAuthenticated) {
      errors.push('Please sign in to proceed with checkout.');
    }
    if (cartLoading) {
      // Waiting for cart to load
    } else if (isEmpty || !cart || cart.items.length === 0) {
      errors.push('Your shopping cart is empty.');
    } else if (hasUnavailableItems) {
      errors.push('Please remove unavailable items before proceeding.');
    }

    if (!selectedAddressId) {
      errors.push('Please select or add a delivery address.');
    }

    if (!selectedPaymentMethod) {
      errors.push('Please select a payment method.');
    }

    const isValid = errors.length === 0 && !cartLoading && !isLoadingAddresses;
    return {
      isValid,
      errors,
      canProceed: isValid,
    };
  }, [
    isAuthenticated,
    cartLoading,
    isEmpty,
    cart?.items.length,
    hasUnavailableItems,
    selectedAddressId,
    selectedPaymentMethod,
    isLoadingAddresses,
  ]);

  const value = useMemo<CheckoutContextValue>(
    () => ({
      addresses,
      isLoadingAddresses,
      addressError,
      selectedAddressId,
      selectedAddress,
      selectAddress: setSelectedAddressId,
      refreshAddresses: loadAddresses,

      isAddressModalOpen,
      editingAddress,
      openAddAddressModal,
      openEditAddressModal,
      closeAddressModal,
      saveAddress,

      selectedPaymentMethod,
      setSelectedPaymentMethod,
      paymentOptions: PAYMENT_OPTIONS,

      validation,
    }),
    [
      addresses,
      isLoadingAddresses,
      addressError,
      selectedAddressId,
      selectedAddress,
      loadAddresses,
      isAddressModalOpen,
      editingAddress,
      openAddAddressModal,
      openEditAddressModal,
      closeAddressModal,
      saveAddress,
      selectedPaymentMethod,
      validation,
    ],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
}
