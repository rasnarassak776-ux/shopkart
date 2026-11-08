export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Module-level in-memory access token storage
let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let authFailureCallback: (() => void) | null = null;

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function onAuthFailure(callback: () => void): void {
  authFailureCallback = callback;
}

export interface RequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, headers: customHeaders = {}, ...rest } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const headers = new Headers(customHeaders);

  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  if (rest.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  // Anti-CSRF protection header
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  // Attach in-memory access token if available
  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      credentials: 'include', // Always send HttpOnly cookies for refresh & auth
    });
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to the server. Please check your network connection.',
      0,
    );
  }

  // If 401 and request is eligible for refresh retry
  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !url.includes('/auth/login') &&
    !url.includes('/auth/refresh')
  ) {
    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(
            `${API_BASE_URL.replace(/\/$/, '')}/api/v1/auth/refresh`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({}),
            },
          );

          if (!refreshRes.ok) {
            setAccessToken(null);
            if (authFailureCallback) {
              authFailureCallback();
            }
            return null;
          }

          const refreshData = await refreshRes.json();
          const newToken = refreshData.accessToken || null;
          setAccessToken(newToken);
          return newToken;
        } catch {
          setAccessToken(null);
          if (authFailureCallback) {
            authFailureCallback();
          }
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newAccessToken = await refreshPromise;

    if (newAccessToken) {
      // Retry original request once with new token
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      try {
        const retryRes = await fetch(url, {
          ...rest,
          headers,
          credentials: 'include',
        });

        if (!retryRes.ok) {
          return handleResponseError(retryRes);
        }

        return retryRes.json();
      } catch (retryError) {
        throw new ApiError(
          'Network error while retrying request after token refresh.',
          0,
        );
      }
    }
  }

  if (!response.ok) {
    return handleResponseError(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function handleResponseError(response: Response): Promise<never> {
  let errorData: any = null;
  try {
    errorData = await response.json();
  } catch {
    // Fallback if response is not JSON
  }

  const status = response.status;
  let message = 'An unexpected error occurred.';
  let errors: string[] | undefined = undefined;

  if (errorData) {
    if (Array.isArray(errorData.message)) {
      errors = errorData.message;
      message = errorData.message[0] || message;
    } else if (typeof errorData.message === 'string') {
      message = errorData.message;
    } else if (typeof errorData.error === 'string') {
      message = errorData.error;
    }
  }

  if (!message && status === 403) {
    message = 'You do not have permission to perform this action.';
  } else if (!message && status === 401) {
    message = 'Authentication required. Please sign in.';
  } else if (!message && status === 404) {
    message = 'Requested resource not found.';
  }

  throw new ApiError(message, status, errors);
}
