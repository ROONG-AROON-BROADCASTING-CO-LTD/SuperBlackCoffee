import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import { createFranchisee, updateFranchiseeStatus } from '../franchisees';
import { createEmployee, listEmployees } from '../users';

describe('admin administration API', () => {
  afterEach(() => vi.clearAllMocks());

  it('uses protected endpoints for employee listing and branch-scoped staff creation', async () => {
    secured.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: 12 });

    await listEmployees();
    await createEmployee({
      name: 'พนักงานสาขา',
      username: 'cashier.aya',
      password: 'safe-password',
      role: 'cashier',
      branchId: 6,
    });

    expect(secured).toHaveBeenNthCalledWith(1, '/users');
    expect(secured).toHaveBeenNthCalledWith(2, '/users', {
      method: 'POST',
      data: expect.objectContaining({ role: 'cashier', branchId: 6 }),
    });
  });

  it('sends franchise lifecycle mutations only through the protected admin routes', async () => {
    secured
      .mockResolvedValueOnce({ id: 9, status: 'invited' })
      .mockResolvedValueOnce({ id: 9, status: 'inactive' });
    const franchise = {
      name: 'แฟรนไชส์ใหม่',
      email: 'owner@example.com',
      plan: 'M' as const,
      branchName: 'สาขาใหม่',
      branchCode: 'FRA-001',
      username: 'owner.fra',
      password: 'safe-password',
    };

    await createFranchisee(franchise);
    await updateFranchiseeStatus(9, 'inactive');

    expect(secured).toHaveBeenNthCalledWith(1, '/franchisees', {
      method: 'POST',
      data: franchise,
    });
    expect(secured).toHaveBeenNthCalledWith(2, '/franchisees/9/status', {
      method: 'PATCH',
      data: { status: 'inactive' },
    });
  });
});
