export interface MerchantAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MerchantStatusFilter = 'all' | 'active' | 'inactive';

export interface MerchantAccountsQuery {
  search?: string;
  status?: MerchantStatusFilter;
  page?: number;
  limit?: number;
}

export interface MerchantAccountsResponse {
  data: MerchantAccount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number };
}

export interface CreateMerchantInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateMerchantInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name?: string; email?: string } | null;
  target: { id: string; name?: string; email?: string } | null;
}
