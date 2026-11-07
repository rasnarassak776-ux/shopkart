import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge, type BadgeVariant, Button, CartIcon, HeartIcon, Price, Rating } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { ProductBadge, ProductSummary } from './types';

const badgeConfig: Record<ProductBadge, { label: string; variant: BadgeVariant }> = {
  bestseller: { label: 'Bestseller', variant: 'dark' },
  new: { label: 'New', variant: 'accent' },
  limited: { label: 'Limited stock', variant: 'warning' },
};

export function ProductCard({ product }: { product: ProductSummary }) {
  const badge = product.badge ? badgeConfig[product.badge] : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow duration-200 hover:shadow-raised">
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {badge && (
          <Badge variant={badge.variant} className="absolute left-3 top-3">
            {badge.label}
          </Badge>
        )}
        <button
          type="button"
          aria-label={`Add ${product.name} to wishlist`}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur transition-colors hover:text-accent-600"
        >
          <HeartIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className={textStyles.productBrand}>{product.brand}</p>
        <h3 className={cn(textStyles.productTitle, 'mt-1 line-clamp-2 min-h-[2.5rem]')}>
          <Link
            href={product.href}
            className="after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:underline-offset-2"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-2">
          <Rating value={product.rating} count={product.reviewCount} />
        </div>
        <Price amount={product.price} compareAt={product.compareAtPrice} className="mt-2.5" />
        <div className="mt-auto pt-3">
          <Button variant="secondary" size="sm" fullWidth className="relative z-10">
            <CartIcon className="h-4 w-4" />
            Add to cart
          </Button>
        </div>
      </div>
    </article>
  );
}
