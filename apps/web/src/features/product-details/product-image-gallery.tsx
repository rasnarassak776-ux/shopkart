'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { StorefrontImage } from '@/features/storefront/types';

function ImageFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-muted text-ink-muted">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m5 19 5-5 3 3 3-3 3 4" />
      </svg>
      <span className="text-xs">{label}</span>
    </div>
  );
}

interface ProductImageGalleryProps {
  images: StorefrontImage[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());

  if (!images || images.length === 0) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-muted">
          <ImageFallback label="No image available" />
        </div>
      </div>
    );
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, images.length - 1));
  const current = images[safeIndex];
  const currentFailed = failedIndexes.has(safeIndex) || !current?.src;

  const markFailed = (index: number) =>
    setFailedIndexes((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-muted">
        {currentFailed ? (
          <ImageFallback label="Image unavailable" />
        ) : (
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt || productName}
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
            onError={() => markFailed(safeIndex)}
            priority
          />
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Product images">
          {images.map((image, index) => {
            const active = index === safeIndex;
            const failed = failedIndexes.has(index);
            return (
              <li key={`${image.src}-${index}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-pressed={active}
                  className={cn(
                    'relative block h-16 w-16 overflow-hidden rounded-lg border bg-surface-muted transition-colors sm:h-20 sm:w-20',
                    active ? 'border-ink' : 'border-line hover:border-ink-muted',
                  )}
                >
                  {failed ? (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-muted">
                      N/A
                    </span>
                  ) : (
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      onError={() => markFailed(index)}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
