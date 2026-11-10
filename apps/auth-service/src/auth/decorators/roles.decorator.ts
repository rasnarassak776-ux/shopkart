import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, UserRole } from '@shopkart/common';

export { ROLES_KEY };

/**
 * Restricts a handler/controller to the listed roles (checked by RolesGuard).
 * There is no implicit hierarchy: list every role that may access the route,
 * e.g. `@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)` for admin functionality.
 */
export const Roles = (...roles: (UserRole | `${UserRole}`)[]) => SetMetadata(ROLES_KEY, roles);
