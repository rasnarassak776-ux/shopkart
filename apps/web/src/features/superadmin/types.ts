export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminStatusFilter = 'all' | 'active' | 'inactive';

export interface AdminAccountsQuery {
  search?: string;
  status?: AdminStatusFilter;
  page?: number;
  limit?: number;
}

export interface AdminAccountsResponse {
  data: AdminAccount[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number };
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateAdminInput {
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
