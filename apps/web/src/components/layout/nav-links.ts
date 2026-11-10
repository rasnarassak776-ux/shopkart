import { UserRole } from '@shopkart/common';

/** Account destinations implemented by the authentication & user-management module. */
export function getAccountLinks(role: string) {
  switch (role) {
    case UserRole.SUPERADMIN:
      return [
        { label: 'Superadmin dashboard', href: '/superadmin/dashboard' },
        { label: 'Manage admins', href: '/superadmin/admins' },
        { label: 'Admin console', href: '/admin/dashboard' },
        { label: 'Profile & security', href: '/profile' },
      ];
    case UserRole.ADMIN:
      return [
        { label: 'Admin dashboard', href: '/admin/dashboard' },
        { label: 'Manage orders', href: '/admin/orders' },
        { label: 'Profile & security', href: '/profile' },
      ];
    default:
      return [
        { label: 'My dashboard', href: '/customer/dashboard' },
        { label: 'My orders', href: '/customer/orders' },
        { label: 'Profile & security', href: '/customer/profile' },
        { label: 'Saved addresses', href: '/customer/addresses' },
      ];
  }
}
