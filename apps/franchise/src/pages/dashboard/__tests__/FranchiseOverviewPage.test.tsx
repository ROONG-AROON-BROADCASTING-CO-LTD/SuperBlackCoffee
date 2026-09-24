import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FranchiseOverviewPage } from '../FranchiseOverviewPage';

const api = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  listEmployees: vi.fn(),
  listInventory: vi.fn(),
  listMenuItems: vi.fn(),
}));

vi.mock('@stackbuild/management', () => ({
  ...api,
}));
vi.mock('@stackbuild/ui', () => ({
  formatCurrency: (value: number) => `${value} บาท`,
  PageIntro: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));
const renderPage = (onNavigate = vi.fn()) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FranchiseOverviewPage
        plan="M"
        branchName="สุพรรณบุรี M"
        branchCode="FR-SUP-001-M"
        onNavigate={onNavigate}
      />
    </QueryClientProvider>,
  );

describe('FranchiseOverviewPage', () => {
  beforeEach(() => {
    api.getDashboardSummary.mockResolvedValue({
      todaySales: 750,
      todayOrders: 3,
    });
    api.listEmployees.mockResolvedValue([{ id: 1 }]);
    api.listMenuItems.mockResolvedValue([
      { id: 1, status: 'available' },
      { id: 2, status: 'soldout' },
    ]);
    api.listInventory.mockImplementation((kind: string) =>
      Promise.resolve(
        kind === 'ingredient'
          ? [
              { id: 1, status: 'ready' },
              { id: 2, status: 'low' },
            ]
          : [{ id: 3, status: 'ready' }],
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('summarizes only the franchise branch data and opens the relevant inventory page', async () => {
    const onNavigate = vi.fn();
    renderPage(onNavigate);

    await waitFor(() => expect(screen.getByText('750 บาท')).toBeTruthy());
    expect(screen.getByText('3 รายการ')).toBeTruthy();
    expect(screen.getAllByText('1/2 พร้อมใช้งาน')).toHaveLength(2);
    expect(api.listMenuItems).toHaveBeenCalledWith('FR-SUP-001-M');
    expect(api.listInventory).toHaveBeenCalledWith(
      'ingredient',
      'FR-SUP-001-M',
    );
    expect(screen.getByText(/สุพรรณบุรี M/u)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ดูวัตถุดิบ' }));
    expect(onNavigate).toHaveBeenCalledWith('วัตถุดิบ');
  });

  it('counts stale branch inventory as needing follow-up rather than ready stock', async () => {
    api.listInventory.mockImplementation((kind: string) =>
      Promise.resolve(
        kind === 'ingredient'
          ? [
              { id: 1, status: 'ready' },
              { id: 2, status: 'stale' },
            ]
          : [{ id: 3, status: 'ready' }],
      ),
    );

    renderPage();

    expect(await screen.findAllByText('1/2 พร้อมใช้งาน')).toHaveLength(2);
    expect(
      screen.getByRole('button', {
        name: /วัตถุดิบใกล้หมด\/หมด\s*1 รายการ/u,
      }),
    ).toBeTruthy();
  });

  it('excludes cost-only recipe inputs from branch stock totals and alerts', async () => {
    api.listInventory.mockImplementation((kind: string) =>
      Promise.resolve(
        kind === 'ingredient'
          ? [
              { id: 1, status: 'ready', trackStock: true },
              { id: 2, status: 'cost_only', trackStock: false },
            ]
          : [{ id: 3, status: 'ready' }],
      ),
    );

    renderPage();

    expect(await screen.findAllByText('1/1 พร้อมใช้งาน')).toHaveLength(2);
    expect(
      screen.getByRole('button', {
        name: /วัตถุดิบใกล้หมด\/หมด\s*0 รายการ/u,
      }),
    ).toBeTruthy();
    expect(api.listInventory).toHaveBeenCalledWith(
      'ingredient',
      'FR-SUP-001-M',
    );
  });
});
