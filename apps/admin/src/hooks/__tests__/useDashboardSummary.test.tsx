import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getDashboardSummary: vi.fn() }));
vi.mock('../../api', () => api);
import { useDashboardSummary } from '../useDashboardSummary';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('isolates cached summaries by branch and company scope when selection changes', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  api.getDashboardSummary.mockImplementation(async (branch, scope) => ({
    todaySales: branch === 'A' ? (scope === 'sbc' ? 10 : 20) : 30,
  }));
  const { result, rerender } = renderHook(
    ({ branch, scope }: { branch: string; scope: 'sbc' | 'franchise' }) =>
      useDashboardSummary(branch, scope),
    { wrapper, initialProps: { branch: 'A', scope: 'sbc' } },
  );
  await waitFor(() => expect(result.current.data?.todaySales).toBe(10));
  rerender({ branch: 'A', scope: 'franchise' });
  await waitFor(() => expect(result.current.data?.todaySales).toBe(20));
  rerender({ branch: 'B', scope: 'franchise' });
  await waitFor(() => expect(result.current.data?.todaySales).toBe(30));
  expect(client.getQueryData(['dashboard-summary', 'A', 'sbc'])).toEqual({
    todaySales: 10,
  });
  expect(client.getQueryData(['dashboard-summary', 'A', 'franchise'])).toEqual({
    todaySales: 20,
  });
  expect(api.getDashboardSummary).toHaveBeenCalledWith('B', 'franchise');
  client.clear();
});

it('exposes a dependency failure without returning a successful summary', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  api.getDashboardSummary.mockRejectedValue(new Error('Forbidden'));
  const { result } = renderHook(() => useDashboardSummary('B', 'franchise'), {
    wrapper,
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe('Forbidden');
  expect(result.current.data).toBeUndefined();
  client.clear();
});
