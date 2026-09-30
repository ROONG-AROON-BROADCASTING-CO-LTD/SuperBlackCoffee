import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());
vi.mock('@stackbuild/management', () => ({ secured }));

import {
  getFranchiseAccountSettings,
  updateFranchiseAccountPassword,
} from '../account';

describe('franchise account API', () => {
  afterEach(() => vi.clearAllMocks());

  it('loads only the current franchise account without a caller-selected tenant', async () => {
    const settings = { username: 'owner.s', branchCode: 'FRA-S' };
    secured.mockResolvedValueOnce(settings);

    await expect(getFranchiseAccountSettings()).resolves.toBe(settings);
    expect(secured).toHaveBeenCalledExactlyOnceWith(
      '/franchise/account-settings',
    );
  });

  it('changes the signed-in account password without sending a franchise or branch id', async () => {
    secured.mockResolvedValueOnce({ id: 22 });
    const input = { currentPassword: 'old-secret', newPassword: 'new-secret' };

    await expect(updateFranchiseAccountPassword(input)).resolves.toEqual({
      id: 22,
    });
    expect(secured).toHaveBeenCalledExactlyOnceWith(
      '/franchise/account-settings/password',
      { method: 'PATCH', data: input },
    );
  });

  it('propagates a rejected password change', async () => {
    secured.mockRejectedValueOnce(new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง'));

    await expect(
      updateFranchiseAccountPassword({
        currentPassword: 'wrong',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow('รหัสผ่านปัจจุบันไม่ถูกต้อง');
  });
});
