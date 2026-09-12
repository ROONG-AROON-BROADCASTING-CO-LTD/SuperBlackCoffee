import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listStockRequests: vi.fn(),
  updateStockRequestStatus: vi.fn(),
}));

vi.mock('../../api', () => api);

import { useUpdateStockRequestStatus } from '../useStockRequests';

const stockRequestsKey = ['stock-requests'] as const;

describe('useUpdateStockRequestStatus', () => {
  let queryClient: QueryClient;

  afterEach(() => {
    queryClient?.clear();
    vi.clearAllMocks();
  });

  it('updates only the changed request and refreshes dependent admin summaries', async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData(stockRequestsKey, [
      { id: 1, status: 'pending' },
      { id: 2, status: 'preparing' },
    ]);
    api.updateStockRequestStatus.mockResolvedValue(undefined);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateStockRequestStatus(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, status: 'completed' });
    });

    expect(api.updateStockRequestStatus).toHaveBeenCalledWith(1, 'completed');
    expect(queryClient.getQueryData(stockRequestsKey)).toEqual([
      { id: 1, status: 'completed' },
      { id: 2, status: 'preparing' },
    ]);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['audit-events'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard-summary'],
    });
  });
});
