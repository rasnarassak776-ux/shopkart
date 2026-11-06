export const ROLES_KEY = 'roles';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}
