import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import {
  createCompanyBranch,
  listBranches,
  updateBranchSize,
} from '../branches';

describe('admin branches API', () => {
  afterEach(() => vi.clearAllMocks());

  it('requests the branch list from the protected endpoint', async () => {
    secured.mockResolvedValueOnce([]);

    await expect(listBranches()).resolves.toEqual([]);
    expect(secured).toHaveBeenCalledWith('/branches');
  });

  it('sends an explicit PATCH size when an admin changes a branch capacity', async () => {
    secured.mockResolvedValueOnce({ id: 14, size: 'M' });

    await expect(updateBranchSize(14, 'M')).resolves.toEqual({
      id: 14,
      size: 'M',
    });
    expect(secured).toHaveBeenCalledWith('/branches/14/size', {
      method: 'PATCH',
      data: { size: 'M' },
    });
  });

  it('creates a company branch through the protected endpoint with its plan size', async () => {
    const branch = {
      id: 15,
      name: 'สาขาใหม่',
      code: 'NEW-01',
      size: 'M' as const,
    };
    secured.mockResolvedValueOnce(branch);

    await expect(
      createCompanyBranch({
        name: 'สาขาใหม่',
        code: 'NEW-01',
        size: 'M',
      }),
    ).resolves.toEqual(branch);
    expect(secured).toHaveBeenCalledWith('/branches', {
      method: 'POST',
      data: { name: 'สาขาใหม่', code: 'NEW-01', size: 'M' },
    });
  });
});
