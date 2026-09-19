import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  request: vi.fn(),
  get: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: mocks.create.mockReturnValue({
      request: mocks.request,
      get: mocks.get,
    }),
    isAxiosError: mocks.isAxiosError,
  },
}));

import { downloadSecuredPDF, publicRequest, secured } from '../client';
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

  it('preserves an API failure message returned in a successful HTTP response', async () => {
    mocks.request.mockResolvedValueOnce({
      data: { success: false, message: 'ข้อมูลสาขาไม่พร้อมใช้งาน' },
    });

    await expect(secured('/branches')).rejects.toThrow(
      'ข้อมูลสาขาไม่พร้อมใช้งาน',
    );
  });

  it('treats a successful no-content mutation as complete', async () => {
    mocks.request.mockResolvedValueOnce({ status: 204, data: '' });

    await expect(
      secured('/catalog-templates/7/menu-items/802/recipes', {
        method: 'PUT',
      }),
    ).resolves.toBeUndefined();
  });

  it('turns malformed JSON responses into a user-friendly message', async () => {
    mocks.isAxiosError.mockReturnValue(false);
    mocks.request.mockRejectedValueOnce(
      new SyntaxError('Unexpected non-whitespace character after JSON'),
    );

    await expect(secured('/maintenance-tickets')).rejects.toThrow(
      'ข้อมูลจากระบบไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง',
    );
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

  it('shows the API message when a PDF endpoint returns an error blob', async () => {
    mocks.get.mockResolvedValueOnce({
      data: new Blob(
        [
          JSON.stringify({
            success: false,
            message: 'ยังไม่มีรายงานสำหรับสาขานี้',
          }),
        ],
        { type: 'application/json' },
      ),
    });

    await expect(
      downloadSecuredPDF('/reports/branch.pdf', 'report.pdf'),
    ).rejects.toThrow('ยังไม่มีรายงานสำหรับสาขานี้');
  });
});
