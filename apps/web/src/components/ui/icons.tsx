import React from 'react';
import { cn } from '@/lib/cn';

export type IconProps = React.SVGProps<SVGSVGElement>;

function createIcon(displayName: string, paths: React.ReactNode) {
  const Icon = ({ className = 'h-5 w-5', ...props }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const SearchIcon = createIcon(
  'SearchIcon',
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

export const CartIcon = createIcon(
  'CartIcon',
  <>
    <path d="M3 4h2l2.4 10.2a1.5 1.5 0 0 0 1.46 1.16h8.48a1.5 1.5 0 0 0 1.45-1.12L20.5 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1.25" />
    <circle cx="17" cy="19.5" r="1.25" />
  </>,
);

export const HeartIcon = createIcon(
  'HeartIcon',
  <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />,
);

export const UserIcon = createIcon(
  'UserIcon',
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </>,
);

export const MenuIcon = createIcon('MenuIcon', <path d="M4 6h16M4 12h16M4 18h16" />);

export const CloseIcon = createIcon('CloseIcon', <path d="M6 6l12 12M18 6 6 18" />);

export const ChevronDownIcon = createIcon('ChevronDownIcon', <path d="m6 9 6 6 6-6" />);

export const ChevronRightIcon = createIcon('ChevronRightIcon', <path d="m9 6 6 6-6 6" />);

export const ArrowRightIcon = createIcon('ArrowRightIcon', <path d="M5 12h14m-6-6 6 6-6 6" />);

export const TruckIcon = createIcon(
  'TruckIcon',
  <>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.75" />
    <circle cx="17.5" cy="18" r="1.75" />
  </>,
);

export const ReturnIcon = createIcon(
  'ReturnIcon',
  <>
    <path d="M4 10h11a5 5 0 0 1 0 10h-3" />
    <path d="m8 6-4 4 4 4" />
  </>,
);

export const ShieldIcon = createIcon(
  'ShieldIcon',
  <>
    <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);

export const SupportIcon = createIcon(
  'SupportIcon',
  <>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2ZM20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z" />
  </>,
);

export const TagIcon = createIcon(
  'TagIcon',
  <>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="8.5" r="1.25" />
  </>,
);

export const GridIcon = createIcon(
  'GridIcon',
  <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
);

export const LogoutIcon = createIcon(
  'LogoutIcon',
  <>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 16l-4-4 4-4M6 12h10" />
  </>,
);

export const MapPinIcon = createIcon(
  'MapPinIcon',
  <>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
);

export const TrashIcon = createIcon(
  'TrashIcon',
  <>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </>,
);

export const PlusIcon = createIcon(
  'PlusIcon',
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>,
);

export const MinusIcon = createIcon(
  'MinusIcon',
  <line x1="5" y1="12" x2="19" y2="12" />,
);

export const CheckIcon = createIcon(
  'CheckIcon',
  <polyline points="20 6 9 17 4 12" />,
);

export const AlertCircleIcon = createIcon(
  'AlertCircleIcon',
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>,
);

export const ShoppingBagIcon = createIcon(
  'ShoppingBagIcon',
  <>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </>,
);

export const PencilIcon = createIcon(
  'PencilIcon',
  <>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </>,
);

export const CreditCardIcon = createIcon(
  'CreditCardIcon',
  <>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </>,
);

export const BanknotesIcon = createIcon(
  'BanknotesIcon',
  <>
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </>,
);

export function SpinnerIcon({ className = 'h-5 w-5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn('animate-spin', className)}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function StarIcon({ className = 'h-4 w-4', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false" className={className} {...props}>
      <path d="M10 1.8l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.42 5.06 17.01 6 11.51 2 7.61l5.53-.8L10 1.8Z" />
    </svg>
  );
}
