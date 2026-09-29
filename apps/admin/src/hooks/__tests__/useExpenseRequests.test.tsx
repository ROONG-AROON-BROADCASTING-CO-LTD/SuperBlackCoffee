import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listExpenseRequests: vi.fn(),
  updateExpenseRequestStatus: vi.fn(),
}));

vi.mock('../../api/expense-requests', () => api);

import { useUpdateExpenseRequestStatus } from '../useExpenseRequests';

const requests = [
  { id: 1, status: 'pending', title: 'First' },
  { id: 2, status: 'approved', title: 'Second' },
];

describe('useUpdateExpenseRequestStatus', () => {
  let queryClient: QueryClient;

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  function setup() {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(['expense-requests'], requests);
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return {
      ...renderHook(() => useUpdateExpenseRequestStatus(), { wrapper }),
      invalidateQueries,
    };
  }

  it('updates only the approved request and refreshes the audit log', async () => {
    api.updateExpenseRequestStatus.mockResolvedValue({
      id: 1,
      status: 'approved',
    });
    const { result, invalidateQueries } = setup();

    await act(async () => {
      await result.current.mutateAsync({ id: 1, status: 'approved' });
    });

    expect(api.updateExpenseRequestStatus).toHaveBeenCalledWith(1, 'approved');
    expect(queryClient.getQueryData(['expense-requests'])).toEqual([
      { id: 1, status: 'approved', title: 'First' },
      requests[1],
    ]);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['audit-events'],
    });
  });

  it('preserves the cached requests when the server rejects the update', async () => {
    api.updateExpenseRequestStatus.mockRejectedValue(new Error('Forbidden'));
    const { result, invalidateQueries } = setup();

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: 1, status: 'approved' }),
      ).rejects.toThrow('Forbidden');
    });

    expect(queryClient.getQueryData(['expense-requests'])).toEqual(requests);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
