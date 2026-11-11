import { UserRole } from '@shopkart/common';

/** Account destinations implemented by the authentication & user-management module. */
export function getAccountLinks(role: string) {
  switch (role) {
    case UserRole.SUPERADMIN:
      return [
        { label: 'Superadmin dashboard', href: '/superadmin/dashboard' },
        { label: 'Manage merchants', href: '/superadmin/merchants' },
        { label: 'Merchant console', href: '/merchant/dashboard' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Profile & security', href: '/profile' },
      ];
    case UserRole.MERCHANT:
      return [
        { label: 'Merchant dashboard', href: '/merchant/dashboard' },
        { label: 'Manage orders', href: '/merchant/orders' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Profile & security', href: '/profile' },
      ];
    default:
      return [
        { label: 'My dashboard', href: '/customer/dashboard' },
        { label: 'My orders', href: '/customer/orders' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Profile & security', href: '/customer/profile' },
        { label: 'Saved addresses', href: '/customer/addresses' },
      ];
  }
}
