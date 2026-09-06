import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicRequest } from '../client';
import { loginAttendance } from '../attendance';

describe('attendance API client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends browser credentials so the HttpOnly attendance session cookie is included', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
      }),
    );
    await publicRequest<{ ok: boolean }>('/attendance/login', {
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/attendance/login'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('accepts a cookie-backed login response without exposing an access token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              name: 'พนักงาน',
              role: 'cashier',
              branchId: 1,
              branchName: 'อยุธยา',
              startsAt: '08:00',
              endsAt: '17:00',
            },
          },
        }),
        { status: 200 },
      ),
    );
    await expect(loginAttendance('staff', '123456')).resolves.toMatchObject({
      user: { name: 'พนักงาน' },
    });
  });
});
