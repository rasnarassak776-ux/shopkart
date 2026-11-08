'use client';

import React, { useState } from 'react';
import { Price, MinusIcon, PlusIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { AddToCartButton } from '@/features/cart';
import type { ProductDetails } from './types';

interface ProductInformationProps {
  product: ProductDetails;
}

export function ProductInformation({ product }: ProductInformationProps) {
  const [quantity, setQuantity] = useState(1);

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < 99) {
      setQuantity((q) => q + 1);
    }
  };

  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setQuantity(Math.min(99, Math.max(1, val)));
    }
  };

  return (
    <div>
      <p className={textStyles.productBrand}>{product.brand}</p>
      <h1 className={cn(textStyles.h1, 'mt-1.5')}>{product.name}</h1>

      <div className="mt-4">
        <Price amount={product.price} size="lg" />
      </div>

      {/* Add to Cart Section */}
      <div className="mt-8 border-y border-line py-6 space-y-4">
        <div className="flex items-center gap-4">
          <label htmlFor="product-qty-input" className="text-sm font-semibold text-ink">
            Quantity:
          </label>
          <div className="inline-flex items-center rounded-lg border border-line bg-surface shadow-sm">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="inline-flex h-11 w-11 items-center justify-center rounded-l-lg text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <input
              id="product-qty-input"
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={handleQuantityInput}
              aria-label="Product quantity"
              className="h-11 w-14 border-x border-line bg-transparent text-center text-sm font-semibold text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= 99}
              aria-label="Increase quantity"
              className="inline-flex h-11 w-11 items-center justify-center rounded-r-lg text-ink-secondary hover:bg-surface-muted hover:text-ink disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-600"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-w-md pt-2">
          <AddToCartButton
            productId={product.id}
            quantity={quantity}
            variant="accent"
            size="lg"
            fullWidth
          />
        </div>
      </div>

      {product.description && (
        <div className="mt-6">
          <h2 className={cn(textStyles.h3, 'mb-2')}>Description</h2>
          <p className={cn(textStyles.body, 'whitespace-pre-line')}>{product.description}</p>
        </div>
      )}
    </div>
  );
}
