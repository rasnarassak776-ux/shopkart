import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';

interface ProductBreadcrumbProps {
  categoryName: string;
  categoryHref: string;
  productName: string;
}

export function ProductBreadcrumb({
  categoryName,
  categoryHref,
  productName,
}: ProductBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className={cn(textStyles.bodySm, 'hover:text-ink hover:underline')}>
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="text-ink-muted">
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </li>
        <li>
          <Link href="/products" className={cn(textStyles.bodySm, 'hover:text-ink hover:underline')}>
            Shop
          </Link>
        </li>
        <li aria-hidden="true" className="text-ink-muted">
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </li>
        <li>
          <Link
            href={categoryHref}
            className={cn(textStyles.bodySm, 'hover:text-ink hover:underline')}
          >
            {categoryName}
          </Link>
        </li>
        <li aria-hidden="true" className="text-ink-muted">
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className={cn(textStyles.bodySm, 'max-w-[16rem] truncate text-ink sm:max-w-xs')}>
          {productName}
        </li>
      </ol>
    </nav>
  );
}
