'use client';

import React, { useEffect, useId, useState } from 'react';
import { Button, FieldError, Input, Label } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { CatalogCategory } from './types';

export interface ProductFilterValues {
  /** Category slug or id. */
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  brand?: string;
}

interface ProductFiltersProps {
  categories: CatalogCategory[];
  brands: string[];
  values: ProductFilterValues;
  /** Apply a partial filter update (page reset is handled by the parent). */
  onApply: (patch: ProductFilterValues) => void;
  onClearAll: () => void;
  className?: string;
}

const selectClasses =
  'block h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20';

function categoryKey(category: CatalogCategory): string {
  return category.slug ?? category.id;
}

function isValidPrice(value: string): boolean {
  if (value.trim() === '') return true;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

/**
 * Filter panel for the catalog: category, price range and brand.
 * All selections are committed to the URL by the parent — the panel only
 * edits local price inputs until Apply is pressed.
 */
export function ProductFilters({
  categories,
  brands,
  values,
  onApply,
  onClearAll,
  className,
}: ProductFiltersProps) {
  const categoryId = useId();
  const brandId = useId();
  const minId = useId();
  const maxId = useId();

  const [minPrice, setMinPrice] = useState(values.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(values.maxPrice ?? '');
  const [priceError, setPriceError] = useState<string | null>(null);

  // Reflect URL changes (back/forward navigation, shared links).
  useEffect(() => {
    setMinPrice(values.minPrice ?? '');
    setMaxPrice(values.maxPrice ?? '');
    setPriceError(null);
  }, [values.minPrice, values.maxPrice]);

  const hasActiveFilters = Boolean(
    values.category || values.minPrice || values.maxPrice || values.brand,
  );

  const applyPrice = () => {
    if (!isValidPrice(minPrice) || !isValidPrice(maxPrice)) {
      setPriceError('Enter valid prices of 0 or more.');
      return;
    }
    const min = minPrice.trim();
    const max = maxPrice.trim();
    if (min !== '' && max !== '' && Number(min) > Number(max)) {
      setPriceError('Minimum price cannot exceed maximum price.');
      return;
    }
    setPriceError(null);
    onApply({ minPrice: min || undefined, maxPrice: max || undefined });
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h2 className={textStyles.h3}>Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <Label htmlFor={categoryId} className="text-sm">
          Category
        </Label>
        <select
          id={categoryId}
          value={values.category ?? ''}
          onChange={(e) =>
            onApply({ category: e.target.value || undefined })
          }
          className={cn(selectClasses, 'mt-1.5')}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={categoryKey(category)}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Price (₹)</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor={minId} className="sr-only">
              Minimum price
            </Label>
            <Input
              id={minId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={maxId} className="sr-only">
              Maximum price
            </Label>
            <Input
              id={maxId}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
        {priceError && <FieldError className="mt-1.5">{priceError}</FieldError>}
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" onClick={applyPrice}>
            Apply price
          </Button>
          {(values.minPrice || values.maxPrice) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
                setPriceError(null);
                onApply({ minPrice: undefined, maxPrice: undefined });
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </fieldset>

      <div>
        <Label htmlFor={brandId} className="text-sm">
          Brand
        </Label>
        <select
          id={brandId}
          value={values.brand ?? ''}
          onChange={(e) => onApply({ brand: e.target.value || undefined })}
          className={cn(selectClasses, 'mt-1.5')}
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
