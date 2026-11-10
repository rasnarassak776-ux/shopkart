import { apiClient } from '@/lib/api-client';
import type {
  AdminAccount,
  AdminAccountsQuery,
  AdminAccountsResponse,
  AuditLogEntry,
  CreateAdminInput,
  UpdateAdminInput,
} from './types';

/**
 * Superadmin endpoints on the auth service. The backend enforces JWT + the
 * `superadmin` role on every route; these helpers only shape requests.
 */
const ADMINS_BASE = '/api/v1/admins';

export function buildAdminsQueryString(query: AdminAccountsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getAdminAccounts(query?: AdminAccountsQuery): Promise<AdminAccountsResponse> {
  return apiClient<AdminAccountsResponse>(`${ADMINS_BASE}${buildAdminsQueryString(query)}`);
}

export async function getAdminAccount(id: string): Promise<AdminAccount> {
  return (await apiClient<{ admin: AdminAccount }>(`${ADMINS_BASE}/${encodeURIComponent(id)}`)).admin;
}

export async function createAdminAccount(input: CreateAdminInput): Promise<AdminAccount> {
  const res = await apiClient<{ admin: AdminAccount }>(ADMINS_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.admin;
}

export async function updateAdminAccount(id: string, input: UpdateAdminInput): Promise<AdminAccount> {
  const res = await apiClient<{ admin: AdminAccount }>(`${ADMINS_BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.admin;
}

export async function setAdminAccountStatus(id: string, isActive: boolean): Promise<AdminAccount> {
  const res = await apiClient<{ admin: AdminAccount }>(`${ADMINS_BASE}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return res.admin;
}

export async function getRecentAuditLogs(limit = 10): Promise<AuditLogEntry[]> {
  return (await apiClient<{ data: AuditLogEntry[] }>(`/api/v1/audit-logs?limit=${limit}`)).data;
}
