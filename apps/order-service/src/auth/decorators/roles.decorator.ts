import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, UserRole } from '@shopkart/common';

export const Roles = (...roles: (UserRole | `${UserRole}` | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
