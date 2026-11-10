'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminErrorState, AdminPanel } from '@/components/admin';
import { Button, buttonClasses, FieldError, FieldHint, Input, Label, SpinnerIcon } from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { createAdminAccount, updateAdminAccount } from './superadmin-api';
import { validateAdminForm, type AdminFormErrors, type AdminFormValues } from './admin-account-utils';
import type { AdminAccount } from './types';

interface AdminAccountFormProps {
  /** Existing admin when editing; omitted when creating. */
  admin?: AdminAccount;
  onSaved?: (admin: AdminAccount) => void;
}

export function AdminAccountForm({ admin, onSaved }: AdminAccountFormProps) {
  const router = useRouter();
  const isEdit = Boolean(admin);
  const [values, setValues] = useState<AdminFormValues>({
    name: admin?.name ?? '',
    email: admin?.email ?? '',
    phone: admin?.phone ?? '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<AdminFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof AdminFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const errors = validateAdminForm(values, { requirePassword: !isEdit });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (admin) {
        const updated = await updateAdminAccount(admin.id, {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
        });
        onSaved?.(updated);
        setSubmitting(false);
      } else {
        await createAdminAccount({
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password!,
          ...(values.phone.trim() && { phone: values.phone.trim() }),
        });
        router.push('/superadmin/admins?created=1');
      }
    } catch (err) {
      setServerError(err instanceof ApiError || err instanceof Error ? err.message : 'Unable to save the admin account.');
      setSubmitting(false);
    }
  };

  const field = (id: keyof AdminFormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div>
      <Label htmlFor={`admin-${id}`}>{label}</Label>
      <Input
        id={`admin-${id}`}
        value={values[id] ?? ''}
        onChange={setField(id)}
        invalid={Boolean(fieldErrors[id])}
        disabled={submitting}
        className="mt-1.5"
        {...props}
      />
      {fieldErrors[id] ? <FieldError>{fieldErrors[id]}</FieldError> : hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError && <AdminErrorState message={serverError} />}

      <AdminPanel className="space-y-5 p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-ink">Account details</h2>
        {field('name', 'Full name', { maxLength: 120, autoComplete: 'off', autoFocus: !isEdit })}
        {field('email', 'Email address', { type: 'email', maxLength: 255, autoComplete: 'off' }, 'Used to sign in on the common login page.')}
        {field('phone', 'Phone (optional)', { type: 'tel', maxLength: 20, autoComplete: 'off' })}
      </AdminPanel>

      {!isEdit && (
        <AdminPanel className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Temporary password</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Share it with the admin through a secure channel and ask them to change it from Profile &amp; security after first sign-in.
            </p>
          </div>
          {field('password', 'Password', { type: 'password', autoComplete: 'new-password', maxLength: 128 }, '12+ characters with upper-case, lower-case, a number and a symbol.')}
          {field('confirmPassword', 'Confirm password', { type: 'password', autoComplete: 'new-password', maxLength: 128 })}
        </AdminPanel>
      )}

      <p className="text-xs text-ink-muted">
        The account is always created with the <span className="font-semibold">admin</span> role. Roles cannot be chosen or changed here.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/superadmin/admins" className={buttonClasses({ variant: 'secondary', className: 'sm:min-w-[8rem]' })}>
          {isEdit ? 'Back to list' : 'Cancel'}
        </Link>
        <Button type="submit" disabled={submitting} className="sm:min-w-[8rem]">
          {submitting && <SpinnerIcon className="h-4 w-4" />}
          {isEdit ? 'Save changes' : 'Create admin'}
        </Button>
      </div>
    </form>
  );
}
