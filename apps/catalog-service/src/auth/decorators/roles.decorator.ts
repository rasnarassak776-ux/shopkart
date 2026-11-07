import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '@shopkart/common';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
