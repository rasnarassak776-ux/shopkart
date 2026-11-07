import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, buttonClasses } from '@/components/ui';
import { textStyles } from '@/design-system/text-styles';
import { cn } from '@/lib/cn';
import { PromoBanner } from './promo-banner';
import type { Promotion } from './types';

interface HeroBannerProps {
  hero: Promotion;
  tiles: Promotion[];
  secondaryCta?: { label: string; href: string };
}

export function HeroBanner({ hero, tiles, secondaryCta }: HeroBannerProps) {
  return (
    <section aria-labelledby="hero-title" className="grid gap-4 lg:grid-cols-3">
      <div className="relative grid overflow-hidden rounded-2xl bg-secondary md:grid-cols-[1.4fr_1fr] lg:col-span-2">
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <p className={cn(textStyles.eyebrow, 'text-accent-700')}>{hero.eyebrow}</p>
          <h1 id="hero-title" className={cn(textStyles.display, 'mt-3')}>
            {hero.title}
          </h1>
          {hero.description && <p className={cn(textStyles.body, 'mt-4 max-w-md')}>{hero.description}</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={hero.cta.href} className={buttonClasses({ variant: 'accent', size: 'lg' })}>
              {hero.cta.label}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            {secondaryCta && (
              <Link href={secondaryCta.href} className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>
        <div className="relative min-h-[260px] sm:min-h-[320px] md:min-h-[440px]">
          <Image
            src={hero.image.src}
            alt={hero.image.alt}
            fill
            priority
            sizes="(min-width: 1024px) 430px, (min-width: 768px) 50vw, 100vw"
            className="object-cover object-top"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        {tiles.map((tile) => (
          <PromoBanner key={tile.id} promotion={tile} />
        ))}
      </div>
    </section>
  );
}
