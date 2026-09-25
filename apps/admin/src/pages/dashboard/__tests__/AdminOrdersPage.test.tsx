import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminOrdersPage } from '../AdminOrdersPage';
import {
  useStockRequests,
  useUpdateStockRequestStatus,
} from '../../../hooks/useStockRequests';
import {
  useExpenseRequests,
  useUpdateExpenseRequestStatus,
} from '../../../hooks/useExpenseRequests';
import { listBranches } from '../../../api/branches';

vi.mock('../../../hooks/useStockRequests', () => ({
  useStockRequests: vi.fn(),
  useUpdateStockRequestStatus: vi.fn(),
}));
vi.mock('../../../hooks/useExpenseRequests', () => ({
  useExpenseRequests: vi.fn(),
  useUpdateExpenseRequestStatus: vi.fn(),
}));
vi.mock('../../../api/branches', () => ({ listBranches: vi.fn() }));

const mockedUseStockRequests = vi.mocked(useStockRequests);
const mockedUseUpdateStockRequestStatus = vi.mocked(
  useUpdateStockRequestStatus,
);
const mockedListBranches = vi.mocked(listBranches);
const mockedUseExpenseRequests = vi.mocked(useExpenseRequests);
const mockedUseUpdateExpenseRequestStatus = vi.mocked(
  useUpdateExpenseRequestStatus,
);
const mutateAsync = vi.fn();
const mutateExpenseAsync = vi.fn();

describe('AdminOrdersPage', () => {
  beforeEach(() => {
    mockedListBranches.mockResolvedValue([
      { id: 51, name: 'อยุธยา', code: 'AYU-001' },
      {
        id: 52,
        name: 'พิษณุโลก',
        code: 'PHS-001',
        franchiseeId: 7,
      },
    ]);
    mockedUseStockRequests.mockReturnValue({
      data: [
        {
          id: 7,
          status: 'pending',
          note: '',
          createdAt: '2026-09-04T02:00:00Z',
          branch: { id: 51, name: 'อยุธยา', isFranchise: false },
          items: [{ name: 'เมล็ดกาแฟ', quantity: 2, unit: 'ถุง' }],
        },
        {
          id: 8,
          status: 'completed',
          note: '',
          createdAt: '2026-09-04T02:00:00Z',
          branch: { id: 52, name: 'พิษณุโลก', isFranchise: true },
          items: [{ name: 'นมสด', quantity: 1, unit: 'กล่อง' }],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useStockRequests>);
    mockedUseUpdateStockRequestStatus.mockReturnValue({
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateStockRequestStatus>);
    mockedUseExpenseRequests.mockReturnValue({
      data: [
        {
          id: 12,
          title: 'ซ่อมเครื่องบดกาแฟ',
          category: 'maintenance',
          estimatedAmount: 1200,
          note: 'เสียงดังผิดปกติ',
          status: 'pending',
          createdAt: '2026-09-04T02:00:00Z',
          requestedByName: 'สมชาย',
          branch: { id: 51, name: 'อยุธยา', isFranchise: false },
        },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useExpenseRequests>);
    mockedUseUpdateExpenseRequestStatus.mockReturnValue({
      mutateAsync: mutateExpenseAsync,
    } as unknown as ReturnType<typeof useUpdateExpenseRequestStatus>);
    mutateAsync.mockResolvedValue({});
    mutateExpenseAsync.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('filters requests to the selected branch and advances a pending request', async () => {
    render(<AdminOrdersPage activeBranch="อยุธยา" />);

    await waitFor(() => expect(screen.getByText('REQ-7')).toBeTruthy());
    expect(screen.queryByText('REQ-8')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'อนุมัติคำขอ' }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ id: 7, status: 'approved' }),
    );
  });

  it('shows an update failure without claiming the request was approved', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('ไม่สามารถบันทึกสถานะได้'));
    render(<AdminOrdersPage activeBranch="อยุธยา" />);

    fireEvent.click(await screen.findByRole('button', { name: 'อนุมัติคำขอ' }));

    expect(await screen.findByText('ไม่สามารถบันทึกสถานะได้')).toBeTruthy();
    expect(screen.getByText('รออนุมัติ')).toBeTruthy();
    expect(screen.queryByText('อัปเดตสถานะคำขอแล้ว')).toBeNull();
  });

  it('separates franchise requests into their own tab', async () => {
    render(<AdminOrdersPage activeBranch="ทุกสาขา" />);

    await waitFor(() => expect(screen.getByText('REQ-7')).toBeTruthy());
    expect(screen.queryByText('REQ-8')).toBeNull();

    fireEvent.click(
      screen.getByRole('tab', { name: 'คำขอวัตถุดิบจากแฟรนไชส์ · 0' }),
    );

    expect(screen.getByText('REQ-8')).toBeTruthy();
    expect(screen.queryByText('REQ-7')).toBeNull();
    expect(screen.getByText('แฟรนไชส์ · พิษณุโลก')).toBeTruthy();
  });

  it('does not render a visual badge for an empty order tab', async () => {
    render(<AdminOrdersPage activeBranch="ทุกสาขา" />);

    const franchiseTab = screen.getByRole('tab', {
      name: 'คำขอวัตถุดิบจากแฟรนไชส์ · 0',
    });
    expect(franchiseTab.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('shows external expense requests separately and advances their workflow', async () => {
    render(<AdminOrdersPage activeBranch="อยุธยา" />);

    fireEvent.click(
      screen.getByRole('tab', { name: 'คำขอค่าใช้จ่ายภายนอก · 1' }),
    );

    expect(await screen.findByText('EXP-12')).toBeTruthy();
    expect(screen.getByText('ซ่อมเครื่องบดกาแฟ')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'อนุมัติคำขอ' }));
    await waitFor(() =>
      expect(mutateExpenseAsync).toHaveBeenCalledWith({
        id: 12,
        status: 'approved',
      }),
    );
  });
});
