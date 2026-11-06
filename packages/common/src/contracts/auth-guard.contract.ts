/**
 * Contract interface for Auth Guard adoption across microservices.
 * Other team members (Member 2, Member 3, Member 4) can consume this contract
 * to validate incoming JWT identity tokens.
 */
export interface IAuthGuardContract {
  canActivate(context: unknown): boolean | Promise<boolean>;
}

export interface IRolesGuardContract {
  canActivate(context: unknown): boolean | Promise<boolean>;
}
