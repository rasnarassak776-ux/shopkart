/** Account destinations implemented by the authentication & user-management module. */
export function getAccountLinks(role: string) {
  const isAdmin = role === 'admin';
  return [
    { label: isAdmin ? 'Admin dashboard' : 'My dashboard', href: isAdmin ? '/admin/dashboard' : '/customer/dashboard' },
    { label: isAdmin ? 'Manage orders' : 'My orders', href: isAdmin ? '/admin/orders' : '/customer/orders' },
    { label: 'Profile & security', href: '/profile' },
    ...(isAdmin ? [] : [{ label: 'Saved addresses', href: '/addresses' }]),
  ];
}
