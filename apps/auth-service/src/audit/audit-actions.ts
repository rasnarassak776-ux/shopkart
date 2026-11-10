export const AuditAction = {
  SUPERADMIN_BOOTSTRAPPED: 'superadmin.bootstrapped',
  ADMIN_CREATED: 'admin.created',
  ADMIN_UPDATED: 'admin.updated',
  ADMIN_ACTIVATED: 'admin.activated',
  ADMIN_DEACTIVATED: 'admin.deactivated',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
