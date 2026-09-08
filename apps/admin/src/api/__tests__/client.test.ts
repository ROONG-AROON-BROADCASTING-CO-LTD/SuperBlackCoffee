import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  request: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: mocks.create.mockReturnValue({ request: mocks.request }),
    isAxiosError: mocks.isAxiosError,
  },
}));

import { publicRequest, secured } from '../client';
import { logout, restoreSession } from '../auth';

describe('admin API client', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the configured cookie-enabled client without a Bearer token', async () => {
    mocks.request.mockResolvedValueOnce({
      data: { success: true, data: { id: 1 } },
    });

    await expect(restoreSession()).resolves.toEqual({ id: 1 });

    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/auth/session',
        headers: { 'X-SBC-Session-Role': 'admin' },
      }),
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: true }),
    );
    expect(
      mocks.request.mock.calls[0][0].headers?.Authorization,
    ).toBeUndefined();
  });

  it('notifies the app when an authenticated request receives 401', async () => {
    const expired = vi.fn();
    window.addEventListener('sbc:session-expired', expired);
    mocks.isAxiosError.mockReturnValue(true);
    mocks.request.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(secured('/auth/session')).rejects.toThrow(
      'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    );

    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener('sbc:session-expired', expired);
  });

  it('keeps an authenticated user signed in when a request receives 403', async () => {
    const expired = vi.fn();
    window.addEventListener('sbc:session-expired', expired);
    mocks.isAxiosError.mockReturnValue(true);
    mocks.request.mockRejectedValueOnce({ response: { status: 403 } });

    await expect(secured('/forbidden')).rejects.toThrow(
      'ไม่สามารถเชื่อมต่อระบบได้',
    );

    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener('sbc:session-expired', expired);
  });

  it('keeps public login requests separate from expiry handling', async () => {
    mocks.isAxiosError.mockReturnValue(false);
    mocks.request.mockRejectedValueOnce(new Error('เข้าสู่ระบบไม่สำเร็จ'));

    await expect(
      publicRequest('/auth/login', { method: 'POST' }),
    ).rejects.toThrow('เข้าสู่ระบบไม่สำเร็จ');
  });

  it('ends only the admin session by identifying its platform role', async () => {
    mocks.request.mockResolvedValueOnce({ data: { success: true } });

    await expect(logout()).resolves.toBeUndefined();

    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/auth/logout',
        method: 'POST',
        headers: { 'X-SBC-Session-Role': 'admin' },
      }),
    );
  });
});
