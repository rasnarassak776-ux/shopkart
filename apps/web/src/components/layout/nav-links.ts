/** Account destinations implemented by the authentication & user-management module. */
export function getAccountLinks(role: string) {
  const isAdmin = role === 'admin';
  return [
    { label: isAdmin ? 'Admin dashboard' : 'My dashboard', href: isAdmin ? '/admin/dashboard' : '/customer/dashboard' },
    { label: 'Profile & security', href: '/profile' },
    ...(isAdmin ? [] : [{ label: 'Saved addresses', href: '/addresses' }]),
  ];
}
