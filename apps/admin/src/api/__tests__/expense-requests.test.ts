import { afterEach, describe, expect, it, vi } from 'vitest';

const secured = vi.hoisted(() => vi.fn());
vi.mock('../client', () => ({ secured }));
import {
  listExpenseRequests,
  updateExpenseRequestStatus,
} from '../expense-requests';

describe('admin expense request contract', () => {
  afterEach(() => vi.resetAllMocks());
  it('loads requests through the protected endpoint', async () => {
    const requests = [{ id: 7, status: 'pending' }];
    secured.mockResolvedValueOnce(requests);
    await expect(listExpenseRequests()).resolves.toBe(requests);
    expect(secured).toHaveBeenCalledExactlyOnceWith('/expense-requests');
  });
  it.each([
    'approved',
    'funded',
    'purchasing',
    'awaiting_documents',
    'completed',
    'rejected',
  ] as const)(
    'sends %s to the selected request without altering the lifecycle status',
    async (status) => {
      secured.mockResolvedValueOnce({ id: 7, status });
      await expect(updateExpenseRequestStatus(7, status)).resolves.toEqual({
        id: 7,
        status,
      });
      expect(secured).toHaveBeenCalledExactlyOnceWith(
        '/expense-requests/7/status',
        { method: 'PATCH', data: { status } },
      );
    },
  );
  it.each([401, 403, 409, 500])(
    'propagates status %s instead of reporting a successful mutation',
    async (status) => {
      const failure = Object.assign(new Error('request rejected'), { status });
      secured.mockRejectedValueOnce(failure);
      await expect(updateExpenseRequestStatus(7, 'approved')).rejects.toBe(
        failure,
      );
      expect(secured).toHaveBeenCalledTimes(1);
    },
  );
});
