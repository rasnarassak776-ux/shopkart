'use client';

/**
 * Razorpay Checkout (checkout.js) loader and promise wrapper.
 * The secret key is never used here — only the public key_id returned by
 * the backend create-order endpoint.
 */

export interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  razorpayOrderId: string;
  /** Amount in the smallest currency unit (paise for INR). */
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout requires a browser.'));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Unable to load the Razorpay checkout script. Check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Thrown when the customer closes the Razorpay modal without paying. */
export class RazorpayCheckoutDismissed extends Error {
  constructor() {
    super('Payment checkout was closed before completion.');
    this.name = 'RazorpayCheckoutDismissed';
  }
}

/**
 * Opens Razorpay Standard Checkout and resolves with the handler response
 * (payment id, order id, signature) on success. Rejects with
 * RazorpayCheckoutDismissed when the modal is dismissed.
 */
export function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<RazorpayCheckoutResponse> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay checkout is not loaded.'));
      return;
    }

    const rzp = new window.Razorpay({
      key: options.keyId,
      order_id: options.razorpayOrderId,
      amount: options.amount,
      currency: options.currency,
      name: options.name || 'Shopkart',
      description: options.description,
      prefill: options.prefill,
      notes: options.notes,
      theme: { color: '#CF4410' },
      handler: (response: RazorpayCheckoutResponse) => resolve(response),
      modal: {
        ondismiss: () => reject(new RazorpayCheckoutDismissed()),
      },
    });

    rzp.open();
  });
}
