import { restoreVerifiedSession } from './session-restore';

type User = { id: string; role: string };

describe('restoreVerifiedSession (page refresh)', () => {
  const superadmin: User = { id: 'u1', role: 'superadmin' };

  it('restores the backend-verified user from the cached access token', async () => {
    const fetchUser = jest.fn(async (token: string) => (token === 'cached' ? superadmin : null));
    const refresh = jest.fn(async () => 'fresh');

    await expect(restoreVerifiedSession<User>({ storedToken: 'cached', fetchUser, refresh })).resolves.toEqual({
      token: 'cached',
      user: superadmin,
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('falls back to the refresh cookie when the cached token is expired', async () => {
    const fetchUser = jest.fn(async (token: string) => {
      if (token === 'expired') throw new Error('401');
      return { id: 'u2', role: 'merchant' };
    });

    await expect(
      restoreVerifiedSession<User>({ storedToken: 'expired', fetchUser, refresh: async () => 'fresh' }),
    ).resolves.toEqual({ token: 'fresh', user: { id: 'u2', role: 'merchant' } });
  });

  it('uses the refresh cookie when nothing is cached', async () => {
    const fetchUser = jest.fn(async () => ({ id: 'u3', role: 'customer' }));
    const result = await restoreVerifiedSession<User>({ storedToken: null, fetchUser, refresh: async () => 'fresh' });
    expect(result?.user.role).toBe('customer');
    expect(fetchUser).toHaveBeenCalledWith('fresh');
  });

  it('returns null (signed out) when neither the cache nor the refresh cookie is valid', async () => {
    await expect(
      restoreVerifiedSession<User>({
        storedToken: 'bad',
        fetchUser: async () => null,
        refresh: async () => {
          throw new Error('401');
        },
      }),
    ).resolves.toBeNull();
  });

  it('always takes the role from the backend, never from cached client state', async () => {
    // Even if sessionStorage was tampered with, only the server response is used.
    const fetchUser = jest.fn(async () => ({ id: 'u4', role: 'customer' }));
    const result = await restoreVerifiedSession<User>({ storedToken: 'cached', fetchUser, refresh: async () => null });
    expect(result?.user.role).toBe('customer');
  });
});
