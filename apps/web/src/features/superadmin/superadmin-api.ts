import { apiClient } from '@/lib/api-client';
import type {
  MerchantAccount,
  MerchantAccountsQuery,
  MerchantAccountsResponse,
  AuditLogEntry,
  CreateMerchantInput,
  UpdateMerchantInput,
} from './types';

/**
 * Superadmin endpoints on the auth service. The backend enforces JWT + the
 * `superadmin` role on every route; these helpers only shape requests.
 */
const MERCHANTS_BASE = '/api/v1/merchants';

export function buildMerchantsQueryString(query: MerchantAccountsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getMerchantAccounts(query?: MerchantAccountsQuery): Promise<MerchantAccountsResponse> {
  return apiClient<MerchantAccountsResponse>(`${MERCHANTS_BASE}${buildMerchantsQueryString(query)}`);
}

export async function getMerchantAccount(id: string): Promise<MerchantAccount> {
  return (await apiClient<{ merchant: MerchantAccount }>(`${MERCHANTS_BASE}/${encodeURIComponent(id)}`)).merchant;
}

export async function createMerchantAccount(input: CreateMerchantInput): Promise<MerchantAccount> {
  const res = await apiClient<{ merchant: MerchantAccount }>(MERCHANTS_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.merchant;
}

export async function updateMerchantAccount(id: string, input: UpdateMerchantInput): Promise<MerchantAccount> {
  const res = await apiClient<{ merchant: MerchantAccount }>(`${MERCHANTS_BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.merchant;
}

export async function setMerchantAccountStatus(id: string, isActive: boolean): Promise<MerchantAccount> {
  const res = await apiClient<{ merchant: MerchantAccount }>(`${MERCHANTS_BASE}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return res.merchant;
}

export async function getRecentAuditLogs(limit = 10): Promise<AuditLogEntry[]> {
  return (await apiClient<{ data: AuditLogEntry[] }>(`/api/v1/audit-logs?limit=${limit}`)).data;
}
