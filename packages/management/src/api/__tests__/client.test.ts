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

import { secured, setManagementSessionRole } from '../client';

describe('management API client', () => {
  afterEach(() => {
    setManagementSessionRole(null);
    vi.clearAllMocks();
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
});
