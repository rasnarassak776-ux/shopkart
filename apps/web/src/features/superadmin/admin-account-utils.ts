import type { AuditLogEntry } from './types';

/** Mirrors the auth-service CreateAdminDto rules so users get feedback before submitting. */
export const ADMIN_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

export interface AdminFormValues {
  name: string;
  email: string;
  phone: string;
  password?: string;
  confirmPassword?: string;
}

export type AdminFormErrors = Partial<Record<keyof AdminFormValues, string>>;

export function validateAdminForm(values: AdminFormValues, { requirePassword }: { requirePassword: boolean }): AdminFormErrors {
  const errors: AdminFormErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();

  if (!name) errors.name = 'Name is required.';
  else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.';

  if (!email) errors.email = 'Email address is required.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';

  if (phone && !PHONE_PATTERN.test(phone)) errors.phone = 'Phone number format is invalid.';

  if (requirePassword) {
    if (!values.password) errors.password = 'A temporary password is required.';
    else if (!ADMIN_PASSWORD_PATTERN.test(values.password)) {
      errors.password = 'Use 12+ characters with upper-case, lower-case, a number and a symbol.';
    }
    if (values.password && values.confirmPassword !== values.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }
  return errors;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'superadmin.bootstrapped': 'Superadmin provisioned',
  'admin.created': 'Admin created',
  'admin.updated': 'Admin updated',
  'admin.activated': 'Admin activated',
  'admin.deactivated': 'Admin deactivated',
};

export function describeAuditLog(entry: AuditLogEntry): { title: string; detail: string } {
  const who = (u: AuditLogEntry['actor']) => u?.name || u?.email || (u ? u.id.slice(0, 8) : 'System (CLI)');
  return {
    title: AUDIT_ACTION_LABELS[entry.action] ?? entry.action,
    detail: entry.target ? `${who(entry.target)} · by ${who(entry.actor)}` : `by ${who(entry.actor)}`,
  };
}
