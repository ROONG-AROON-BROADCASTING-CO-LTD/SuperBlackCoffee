import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());

vi.mock('../client', () => ({ secured }));

import { listStockRequests, updateStockRequestStatus } from '../stock-requests';

describe('admin stock requests API', () => {
  afterEach(() => vi.clearAllMocks());

  it('loads every stock request from the protected operations endpoint', async () => {
    const requests = [
      {
        id: 7,
        status: 'pending' as const,
        createdAt: '2026-09-16T00:00:00Z',
        branch: { id: 2, name: 'อยุธยา' },
        items: [{ name: 'เมล็ดกาแฟ', quantity: 2, unit: 'ถุง' }],
      },
    ];
    secured.mockResolvedValueOnce(requests);

    await expect(listStockRequests()).resolves.toEqual(requests);
    expect(secured).toHaveBeenCalledWith('/stock-requests');
  });

  it('sends the selected lifecycle status with a protected PATCH request', async () => {
    secured.mockResolvedValueOnce({ id: 7, status: 'preparing' });

    await expect(updateStockRequestStatus(7, 'preparing')).resolves.toEqual({
      id: 7,
      status: 'preparing',
    });
    expect(secured).toHaveBeenCalledWith('/stock-requests/7/status', {
      method: 'PATCH',
      data: { status: 'preparing' },
    });
  });
});
