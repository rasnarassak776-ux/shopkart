import React from 'react';
import { Price } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { ProductDetails } from './types';

interface ProductInformationProps {
  product: ProductDetails;
}

export function ProductInformation({ product }: ProductInformationProps) {
  return (
    <div>
      <p className={textStyles.productBrand}>{product.brand}</p>
      <h1 className={cn(textStyles.h1, 'mt-1.5')}>{product.name}</h1>

      <div className="mt-4">
        <Price amount={product.price} size="lg" />
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
