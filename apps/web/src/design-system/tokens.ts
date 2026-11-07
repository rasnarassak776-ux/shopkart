/**
 * Shopkart design tokens — single source of truth for the visual identity.
 * Consumed by tailwind.config.ts; components should use the generated Tailwind
 * utilities (e.g. `bg-accent-600`, `text-ink-muted`, `rounded-xl`) rather than raw values.
 */

/** Warm neutral scale. Also aliased to Tailwind's `gray` so existing pages adopt it. */
export const neutral = {
  50: '#FAFAF9',
  100: '#F4F4F2',
  200: '#E8E6E3',
  300: '#D5D3CF',
  400: '#A6A39E',
  500: '#77746F',
  600: '#5A5752',
  700: '#43413D',
  800: '#2B2A27',
  900: '#1C1B19',
  950: '#0F0E0D',
} as const;

/** Shopkart Coral — accent used for primary calls-to-action, sale signals and highlights. */
export const coral = {
  50: '#FFF4EF',
  100: '#FFE6DA',
  200: '#FFC9B0',
  300: '#FFA47E',
  400: '#FB7D4D',
  500: '#F2602B',
  600: '#CF4410',
  700: '#A8360D',
  800: '#862E10',
  900: '#6C2811',
} as const;

/** Sand — warm secondary surface for editorial and promotional sections. */
export const sand = {
  DEFAULT: '#F5EEE4',
  strong: '#EBDFCE',
  ink: '#5B4630',
} as const;

export const colors = {
  gray: neutral,
  accent: { ...coral, DEFAULT: coral[600] },
  primary: { DEFAULT: neutral[900], hover: neutral[800] },
  secondary: sand,
  canvas: neutral[50],
  surface: { DEFAULT: '#FFFFFF', muted: neutral[100] },
  ink: {
    DEFAULT: neutral[900],
    secondary: neutral[600],
    muted: neutral[500],
    inverse: '#FFFFFF',
  },
  line: { DEFAULT: neutral[200], strong: neutral[300] },
  success: { DEFAULT: '#15803D', soft: '#ECFDF3' },
  danger: { DEFAULT: '#B42318', soft: '#FEF3F2' },
  warning: { DEFAULT: '#A15C07', soft: '#FEF6E7' },
} as const;

/**
 * Radius scale: controls (buttons/inputs) use `rounded-lg`, cards `rounded-xl`,
 * banners/panels `rounded-2xl`, pills/badges `rounded-full`.
 */
export const radii = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.625rem',
  xl: '0.875rem',
  '2xl': '1.25rem',
} as const;

const shadowInk = '28 27 25';

export const shadows = {
  card: `0 1px 2px 0 rgb(${shadowInk} / 0.04), 0 1px 3px 0 rgb(${shadowInk} / 0.06)`,
  raised: `0 2px 4px -1px rgb(${shadowInk} / 0.06), 0 12px 24px -8px rgb(${shadowInk} / 0.14)`,
  overlay: `0 24px 48px -12px rgb(${shadowInk} / 0.28)`,
} as const;

export const fontFamily: Record<'sans' | 'display', string[]> = {
  sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
};

export const maxWidth = {
  container: '80rem',
} as const;
