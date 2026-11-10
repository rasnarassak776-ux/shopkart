export const AuditAction = {
  SUPERADMIN_BOOTSTRAPPED: 'superadmin.bootstrapped',
  MERCHANT_CREATED: 'merchant.created',
  MERCHANT_UPDATED: 'merchant.updated',
  MERCHANT_ACTIVATED: 'merchant.activated',
  MERCHANT_DEACTIVATED: 'merchant.deactivated',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
