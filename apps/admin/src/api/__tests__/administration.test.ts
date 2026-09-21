import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());
const publicRequest = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ publicRequest, secured }));

import { listAuditEvents } from '../audit';
import { login, logout, restoreSession } from '../auth';
import {
  createFranchisee,
  listFranchisees,
  updateFranchiseeStatus,
} from '../franchisees';
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

  it('uses the admin role header when restoring and ending the platform session', async () => {
    publicRequest.mockResolvedValueOnce({ user: { id: 1, role: 'admin' } });
    secured.mockResolvedValueOnce({ user: { id: 1, role: 'admin' } });
    publicRequest.mockResolvedValueOnce(undefined);

    await login('admin', 'safe-password');
    await restoreSession();
    await logout();

    expect(publicRequest).toHaveBeenNthCalledWith(1, '/auth/login', {
      method: 'POST',
      data: { username: 'admin', password: 'safe-password' },
    });
    expect(secured).toHaveBeenCalledWith('/auth/session', {
      headers: { 'X-SBC-Session-Role': 'admin' },
    });
    expect(publicRequest).toHaveBeenNthCalledWith(2, '/auth/logout', {
      method: 'POST',
      headers: { 'X-SBC-Session-Role': 'admin' },
    });
  });

  it('loads franchise and audit listings from their protected endpoints', async () => {
    secured.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await listFranchisees();
    await listAuditEvents();

    expect(secured).toHaveBeenNthCalledWith(1, '/franchisees');
    expect(secured).toHaveBeenNthCalledWith(2, '/audit-events?limit=100');
  });
});
