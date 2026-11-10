export interface RestoreSessionDeps<U> {
  /** Access token cached in sessionStorage from a previous page load, if any. */
  storedToken: string | null;
  /** Resolves the backend-verified user (`GET /auth/me`) for a token; null/throw when invalid. */
  fetchUser: (token: string) => Promise<U | null>;
  /** Exchanges the HttpOnly refresh cookie for a new access token; null/throw when unavailable. */
  refresh: () => Promise<string | null>;
}

/**
 * Restores a session on page load. The cached user object is never trusted:
 * identity and role always come from the backend, first with the cached access
 * token and otherwise via the refresh cookie.
 */
export async function restoreVerifiedSession<U>({
  storedToken,
  fetchUser,
  refresh,
}: RestoreSessionDeps<U>): Promise<{ token: string; user: U } | null> {
  if (storedToken) {
    const user = await fetchUser(storedToken).catch(() => null);
    if (user) return { token: storedToken, user };
  }

  const token = await refresh().catch(() => null);
  if (!token) return null;

  const user = await fetchUser(token).catch(() => null);
  return user ? { token, user } : null;
}
