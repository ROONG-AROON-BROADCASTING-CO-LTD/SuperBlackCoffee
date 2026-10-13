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

import {
  secured,
  setManagementSessionRole,
  resetManagementRequests,
} from '../client';

describe('management API client', () => {
  afterEach(() => {
    resetManagementRequests();
    setManagementSessionRole(null);
    vi.clearAllMocks();
  });

  it('does not reuse a previous account pending GET after session reset', async () => {
    setManagementSessionRole('franchise_owner');
    let finishOld!: (value: unknown) => void;
    mocks.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve;
      }),
    );
    const previous = secured('/attendance/leave-requests');
    resetManagementRequests();
    mocks.request.mockResolvedValueOnce({
      data: { success: true, data: ['new-tenant'] },
    });
    await expect(secured('/attendance/leave-requests')).resolves.toEqual([
      'new-tenant',
    ]);
    expect(mocks.request).toHaveBeenCalledTimes(2);
    finishOld({ data: { success: true, data: ['old-tenant'] } });
    await previous;
    mocks.request.mockResolvedValueOnce({
      data: { success: true, data: ['new-refresh'] },
    });
    await expect(secured('/attendance/leave-requests')).resolves.toEqual([
      'new-refresh',
    ]);
    expect(mocks.request).toHaveBeenCalledTimes(3);
  });

  it('isolates pending GETs between Admin and Franchise roles', async () => {
    let finish!: (value: unknown) => void;
    setManagementSessionRole('admin');
    mocks.request.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const admin = secured('/users');
    setManagementSessionRole('franchise_owner');
    mocks.request.mockResolvedValueOnce({
      data: { success: true, data: ['own-staff'] },
    });
    await expect(secured('/users')).resolves.toEqual(['own-staff']);
    finish({ data: { success: true, data: ['company-staff'] } });
    await expect(admin).resolves.toEqual(['company-staff']);
    expect(mocks.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ headers: { 'X-SBC-Session-Role': 'admin' } }),
    );
    expect(mocks.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        headers: { 'X-SBC-Session-Role': 'franchise_owner' },
      }),
    );
  });

  it('clears a failed request before retrying and does not deduplicate mutations', async () => {
    mocks.request.mockRejectedValueOnce(new Error('offline'));
    await expect(secured('/users')).rejects.toThrow('offline');
    mocks.request.mockResolvedValueOnce({
      data: { success: true, data: ['recovered'] },
    });
    await expect(secured('/users')).resolves.toEqual(['recovered']);
    mocks.request.mockResolvedValue({
      data: { success: true, data: { id: 1 } },
    });
    await Promise.all([
      secured('/users', { method: 'POST' }),
      secured('/users', { method: 'POST' }),
    ]);
    expect(mocks.request).toHaveBeenCalledTimes(4);
  });

  it('sends the active platform role with protected requests', async () => {
    setManagementSessionRole('franchise_owner');
    mocks.request.mockResolvedValueOnce({ data: { success: true, data: [] } });

    await expect(secured('/branches')).resolves.toEqual([]);

    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/branches',
        headers: { 'X-SBC-Session-Role': 'franchise_owner' },
      }),
    );
  });

  it('treats an empty 204 response as a successful request', async () => {
    mocks.request.mockResolvedValueOnce({ status: 204, data: '' });

    await expect(
      secured<void>('/users/96', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('reuses an identical GET while the first request is still pending', async () => {
    let resolveRequest!: (value: unknown) => void;
    mocks.request.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const first = secured<unknown[]>('/menu-items?branchCode=SBC-AYA-001');
    const second = secured<unknown[]>('/menu-items?branchCode=SBC-AYA-001');
    expect(mocks.request).toHaveBeenCalledOnce();

    resolveRequest({ data: { success: true, data: [] } });
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
  });
});
