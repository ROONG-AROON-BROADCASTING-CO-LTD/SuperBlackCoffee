import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import { listBranches, updateBranchSize } from '../branches';

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
});
