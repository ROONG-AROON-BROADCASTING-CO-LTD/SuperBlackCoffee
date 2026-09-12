import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryAutoRetrySnackbar } from './AutoRetrySnackbar';
import { useAutoRetry } from '../hooks/useAutoRetry';

function ManualLoadHarness({ hasError }: { hasError: boolean }) {
  useAutoRetry(hasError, vi.fn());
  return <QueryAutoRetrySnackbar />;
}

describe('QueryAutoRetrySnackbar', () => {
  it('uses the shared retry snackbar for useEffect-based loading failures', async () => {
    const queryClient = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ManualLoadHarness hasError />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/เชื่อมต่อระบบไม่ได้ จะลองใหม่ใน/)).toBeTruthy();

    rerender(
      <QueryClientProvider client={queryClient}>
        <ManualLoadHarness hasError={false} />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByText(/เชื่อมต่อระบบไม่ได้ จะลองใหม่ใน/)).toBeNull(),
    );
  });
});
