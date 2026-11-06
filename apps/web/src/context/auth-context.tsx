'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  apiClient,
  setAccessToken as setGlobalAccessToken,
  onAuthFailure,
  ApiError,
} from '../lib/api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'admin' | string;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  updateUserState: (updatedFields: Partial<AuthUser>) => void;
  refreshProfile: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync token state to API client
  const updateTokens = useCallback((token: string | null, newUser: AuthUser | null) => {
    setAccessTokenState(token);
    setGlobalAccessToken(token);
    setUser(newUser);
  }, []);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Call refresh endpoint using HttpOnly cookie
      const refreshRes = await apiClient<{
        success: boolean;
        accessToken: string;
      }>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
        skipAuthRefresh: true,
      });

      if (!refreshRes || !refreshRes.accessToken) {
        updateTokens(null, null);
        return false;
      }

      setGlobalAccessToken(refreshRes.accessToken);
      setAccessTokenState(refreshRes.accessToken);

      // 2. Fetch current verified user info from backend
      const meRes = await apiClient<{
        success: boolean;
        user: { id: string; email: string; role: string; name?: string; phone?: string | null };
      }>('/api/v1/auth/me', {
        skipAuthRefresh: true,
      });

      if (meRes && meRes.user) {
        const restoredUser: AuthUser = {
          id: meRes.user.id,
          name: meRes.user.name || meRes.user.email.split('@')[0],
          email: meRes.user.email,
          role: meRes.user.role,
          phone: meRes.user.phone || null,
        };
        setUser(restoredUser);
        return true;
      }

      updateTokens(null, null);
      return false;
    } catch {
      updateTokens(null, null);
      return false;
    }
  }, [updateTokens]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    return restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser> => {
      const response = await apiClient<{
        success: boolean;
        message: string;
        user: AuthUser;
        accessToken: string;
      }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        skipAuthRefresh: true,
      });

      updateTokens(response.accessToken, response.user);
      return response.user;
    },
    [updateTokens],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      return apiClient<{ success: boolean; message: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
        skipAuthRefresh: true,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
        skipAuthRefresh: true,
      });
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      updateTokens(null, null);
    }
  }, [updateTokens]);

  const updateUserState = useCallback((updatedFields: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  }, []);

  const refreshProfile = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const profile = await apiClient<any>('/api/v1/users/me');
      if (profile && profile.id) {
        const updated: AuthUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || null,
          role: profile.role,
          createdAt: profile.createdAt ? String(profile.createdAt) : undefined,
        };
        setUser(updated);
        return updated;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Handle global background token refresh failures
  useEffect(() => {
    onAuthFailure(() => {
      updateTokens(null, null);
    });
  }, [updateTokens]);

  // Initial session restoration on app mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      await restoreSession();
      if (isMounted) {
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [restoreSession]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      restoreSession,
      updateUserState,
      refreshProfile,
    }),
    [
      user,
      accessToken,
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      restoreSession,
      updateUserState,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
