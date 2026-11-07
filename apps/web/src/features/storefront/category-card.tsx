import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CategorySummary } from './types';

export function CategoryCard({ category }: { category: CategorySummary }) {
  return (
    <Link href={category.href} className="group block rounded-xl text-center">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-muted transition-shadow duration-200 group-hover:shadow-raised">
        <Image
          src={category.image.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 140px, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <p className="mt-2.5 font-display text-xs font-semibold text-ink group-hover:text-accent-600 sm:text-sm">
        {category.name}
      </p>
      <p className="mt-0.5 hidden text-xs text-ink-muted sm:block">{category.itemCountLabel}</p>
    </Link>
  );
}
