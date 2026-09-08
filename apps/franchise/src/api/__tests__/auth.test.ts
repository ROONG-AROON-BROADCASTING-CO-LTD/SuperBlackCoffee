import { afterEach, describe, expect, it, vi } from 'vitest';
import { login, logout, restoreSession } from '../auth';

describe('franchise auth API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends login through a credentialed cookie request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { user: { id: 1, role: 'franchise_owner', plan: 'M' } },
        }),
        { status: 200 },
      ),
    );

    await expect(login('owner', 'password')).resolves.toMatchObject({
      user: { role: 'franchise_owner', plan: 'M' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({ username: 'owner', password: 'password' }),
      }),
    );
  });

  it('restores and ends a session using the HttpOnly cookie transport', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { user: { id: 1, role: 'franchise_owner', plan: 'S' } },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: null }), {
          status: 200,
        }),
      );

    await restoreSession();
    await logout();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/auth/session'),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });
});
