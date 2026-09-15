import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FranchiseIngredientRequestsPage } from '../FranchiseIngredientRequestsPage';
import { listStockRequests } from '@stackbuild/management';

vi.mock('@stackbuild/management', async () => {
  const actual = await vi.importActual<typeof import('@stackbuild/management')>(
    '@stackbuild/management',
  );
  return { ...actual, listStockRequests: vi.fn() };
});

const mockedListStockRequests = vi.mocked(listStockRequests);

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FranchiseIngredientRequestsPage />
    </QueryClientProvider>,
  );
};

describe('FranchiseIngredientRequestsPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows a clear empty state when the franchise has not submitted a request', async () => {
    mockedListStockRequests.mockResolvedValue([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('ยังไม่มีคำขอวัตถุดิบ')).toBeTruthy(),
    );
    expect(screen.getByText('รออนุมัติ 0 รายการ')).toBeTruthy();
  });

  it('shows request items and the pending count from the API', async () => {
    mockedListStockRequests.mockResolvedValue([
      {
        id: 7,
        status: 'pending',
        note: 'คำขอทดสอบ',
        createdAt: '2026-09-04T02:00:00Z',
        branch: { id: 51, name: 'สาขาสุพรรณบุรี' },
        items: [{ name: 'เมล็ดกาแฟ', quantity: 2, unit: 'ถุง' }],
      },
    ]);
    renderPage();

    await waitFor(() => expect(screen.getByText('คำขอ #7')).toBeTruthy());
    expect(screen.getByText('รออนุมัติ 1 รายการ')).toBeTruthy();
    expect(
      screen.getByText('รออนุมัติ', { selector: '.MuiChip-label' }),
    ).toBeTruthy();
    expect(screen.getByText('เมล็ดกาแฟ × 2 ถุง')).toBeTruthy();
  });

  it('shows a safe error state when the franchise request query fails', async () => {
    mockedListStockRequests.mockRejectedValue(new Error('network unavailable'));
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('ไม่สามารถโหลดคำขอวัตถุดิบได้')).toBeTruthy(),
    );
    expect(screen.getByText('รออนุมัติ 0 รายการ')).toBeTruthy();
  });
});
