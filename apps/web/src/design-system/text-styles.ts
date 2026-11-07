/**
 * Composed typography styles. Use these instead of hand-assembling heading,
 * navigation, product-title and price classes so every page reads consistently.
 */
export const textStyles = {
  display: 'font-display text-[2.125rem] font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl',
  h1: 'font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl',
  h2: 'font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]',
  h3: 'font-display text-lg font-semibold tracking-tight text-ink',
  eyebrow: 'font-display text-xs font-semibold uppercase tracking-[0.14em]',
  body: 'text-base leading-relaxed text-ink-secondary',
  bodySm: 'text-sm leading-relaxed text-ink-secondary',
  nav: 'font-display text-sm font-medium text-ink',
  productBrand: 'text-xs font-medium uppercase tracking-wide text-ink-muted',
  productTitle: 'text-sm font-medium leading-snug text-ink',
  price: 'font-sans font-semibold tabular-nums text-ink',
  priceCompare: 'font-sans tabular-nums text-ink-muted line-through',
} as const;
