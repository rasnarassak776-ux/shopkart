import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, buttonClasses } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import type { PromoTone, Promotion } from './types';

const toneClasses: Record<PromoTone, { surface: string; eyebrow: string; title: string; body: string }> = {
  dark: {
    surface: 'bg-primary',
    eyebrow: 'text-accent-300',
    title: 'text-white',
    body: 'text-gray-300',
  },
  sand: {
    surface: 'bg-secondary',
    eyebrow: 'text-accent-700',
    title: 'text-ink',
    body: 'text-ink-secondary',
  },
  accent: {
    surface: 'bg-accent-50',
    eyebrow: 'text-accent-700',
    title: 'text-ink',
    body: 'text-ink-secondary',
  },
};

interface PromoBannerProps {
  promotion: Promotion;
  size?: 'md' | 'lg';
}

export function PromoBanner({ promotion, size = 'md' }: PromoBannerProps) {
  const tone = toneClasses[promotion.tone];

  return (
    <div
      className={cn(
        'group relative isolate flex overflow-hidden rounded-2xl',
        tone.surface,
        size === 'lg' ? 'min-h-[240px] sm:min-h-[280px]' : 'min-h-[200px]',
      )}
    >
      <div className={cn('relative z-10 flex w-3/5 flex-col justify-center', size === 'lg' ? 'p-6 sm:p-8' : 'p-6')}>
        <p className={cn(textStyles.eyebrow, tone.eyebrow)}>{promotion.eyebrow}</p>
        <h3
          className={cn(
            'mt-2 font-display font-bold leading-tight tracking-tight',
            size === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl',
            tone.title,
          )}
        >
          {promotion.title}
        </h3>
        {promotion.description && <p className={cn('mt-2 text-sm', tone.body)}>{promotion.description}</p>}
        <Link
          href={promotion.cta.href}
          className={buttonClasses({
            variant: promotion.tone === 'dark' ? 'inverse' : 'primary',
            size: 'sm',
            className: 'mt-5 self-start after:absolute after:inset-0 after:content-[\'\']',
          })}
        >
          {promotion.cta.label}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
      <div className="absolute inset-y-0 right-0 w-2/5">
        <Image
          src={promotion.image.src}
          alt={promotion.image.alt}
          fill
          sizes="(min-width: 1024px) 240px, 40vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    </div>
  );
}
