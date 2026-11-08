'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '../cart-context';
import { Button, CartIcon, CheckIcon, SpinnerIcon, type ButtonVariant, type ButtonSize } from '@/components/ui';

interface AddToCartButtonProps {
  productId: string;
  quantity?: number;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function AddToCartButton({
  productId,
  quantity = 1,
  disabled = false,
  variant = 'secondary',
  size = 'sm',
  fullWidth = true,
  className,
  showIcon = true,
}: AddToCartButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { addItem, showToast } = useCart();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('Please sign in to add items to your shopping cart.', 'info');
      const returnUrl = encodeURIComponent(pathname || '/products');
      router.push(`/login?returnUrl=${returnUrl}`);
      return;
    }

    if (loading || disabled) return;

    setLoading(true);
    setSuccess(false);

    try {
      const res = await addItem(productId, quantity);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1800);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={success ? 'accent' : variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      disabled={disabled || loading}
      onClick={handleAddToCart}
      aria-label="Add product to shopping cart"
    >
      {loading ? (
        <>
          <SpinnerIcon className="h-4 w-4" />
          <span>Adding...</span>
        </>
      ) : success ? (
        <>
          <CheckIcon className="h-4 w-4" />
          <span>Added!</span>
        </>
      ) : (
        <>
          {showIcon && <CartIcon className="h-4 w-4" />}
          <span>Add to cart</span>
        </>
      )}
    </Button>
  );
}
