'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  apiClient,
  setAccessToken as setGlobalAccessToken,
  onAuthFailure,
  onTokenRefreshed,
  ApiError,
} from '../lib/api-client';

const TOKEN_STORAGE_KEY = 'shopkart_auth_token';
const USER_STORAGE_KEY = 'shopkart_auth_user';
const AUTH_CHANNEL_NAME = 'shopkart_auth';

type AuthBroadcast = { type: 'login'; userId: string } | { type: 'logout' };

function persistSession(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
}

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
  const userRef = useRef<AuthUser | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Sync token state to API client
  const updateTokens = useCallback((token: string | null, newUser: AuthUser | null) => {
    setAccessTokenState(token);
    setGlobalAccessToken(token);
    setUser(newUser);
    userRef.current = newUser;
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const broadcast = useCallback((message: AuthBroadcast) => {
    channelRef.current?.postMessage(message);
  }, []);

  const fetchCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
    const meRes = await apiClient<{
      success: boolean;
      user: { id: string; email: string; role: string; name?: string; phone?: string | null };
    }>('/api/v1/auth/me', {
      skipAuthRefresh: true,
    });

    if (!meRes || !meRes.user) return null;
    return {
      id: meRes.user.id,
      name: meRes.user.name || meRes.user.email.split('@')[0],
      email: meRes.user.email,
      role: meRes.user.role,
      phone: meRes.user.phone || null,
    };
  }, []);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      // Check session storage first for seamless page reloads
      if (typeof window !== 'undefined') {
        const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            updateTokens(storedToken, parsedUser);
            return true;
          } catch {
            clearStoredSession();
          }
        }
      }

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
      const restoredUser = await fetchCurrentUser();

      if (restoredUser) {
        updateTokens(refreshRes.accessToken, restoredUser);
        persistSession(refreshRes.accessToken, restoredUser);
        return true;
      }

      updateTokens(null, null);
      return false;
    } catch {
      updateTokens(null, null);
      return false;
    }
  }, [updateTokens, fetchCurrentUser]);

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
      persistSession(response.accessToken, response.user);
      broadcast({ type: 'login', userId: response.user.id });
      return response.user;
    },
    [updateTokens, broadcast],
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
      clearStoredSession();
      updateTokens(null, null);
      broadcast({ type: 'logout' });
    }
  }, [updateTokens, broadcast]);

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
      clearStoredSession();
      updateTokens(null, null);
    });
  }, [updateTokens]);

  // Keep this tab's session in step with silent token refreshes. If the shared
  // refresh cookie now belongs to a different account, adopt that account so the
  // UI (and route guards) reflect the identity the backend actually sees.
  useEffect(() => {
    onTokenRefreshed(async (token, accountChanged) => {
      if (!accountChanged && userRef.current) {
        setAccessTokenState(token);
        persistSession(token, userRef.current);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser();
        if (currentUser) {
          updateTokens(token, currentUser);
          persistSession(token, currentUser);
          return;
        }
      } catch {
        // Fall through to sign-out
      }
      clearStoredSession();
      updateTokens(null, null);
    });
  }, [updateTokens, fetchCurrentUser]);

  // Cross-tab sync: a login/logout in another tab replaces the shared refresh
  // cookie, so this tab must drop its stale session and re-resolve it.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<AuthBroadcast>) => {
      const message = event.data;
      if (message.type === 'logout') {
        clearStoredSession();
        updateTokens(null, null);
      } else if (message.type === 'login' && userRef.current?.id !== message.userId) {
        clearStoredSession();
        void restoreSession();
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [updateTokens, restoreSession]);

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
