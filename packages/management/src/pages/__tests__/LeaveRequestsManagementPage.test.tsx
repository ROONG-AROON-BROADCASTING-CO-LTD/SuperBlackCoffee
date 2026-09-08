import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaveRequestsManagementPage } from '../LeaveRequestsManagementPage';
import {
  listManagedLeaveRequests,
  updateManagedLeaveRequest,
} from '../../api/attendance';

vi.mock('../../api/attendance', () => ({
  listManagedLeaveRequests: vi.fn(),
  updateManagedLeaveRequest: vi.fn(),
}));

const leaveRequests = vi.mocked(listManagedLeaveRequests);
const updateLeave = vi.mocked(updateManagedLeaveRequest);

const renderPage = (franchiseMode = false) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LeaveRequestsManagementPage franchiseMode={franchiseMode} />
    </QueryClientProvider>,
  );

describe('LeaveRequestsManagementPage', () => {
  beforeEach(() => {
    leaveRequests.mockResolvedValue([
      {
        id: 4,
        name: 'พิมพ์ชนก',
        branchName: 'อยุธยา',
        leaveDate: '2026-09-08',
        leaveType: 'sick',
        reason: 'ไม่สบาย',
        status: 'pending',
        createdAt: '2026-09-06T01:00:00Z',
      },
    ]);
    updateLeave.mockResolvedValue({ id: 4, status: 'approved' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows only the franchise workspace leave requests', async () => {
    renderPage(true);

    expect(await screen.findByText(/พิมพ์ชนก/)).toBeTruthy();
    expect(
      screen.getByText('พิจารณาคำขอลาของพนักงานในแฟรนไชส์ของคุณ'),
    ).toBeTruthy();
  });

  it('approves a pending leave request', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'อนุมัติ' }));
    await waitFor(() =>
      expect(updateLeave).toHaveBeenCalledWith(4, 'approved'),
    );
  });

  it('keeps the request pending and shows an error when approval fails', async () => {
    updateLeave.mockRejectedValueOnce(new Error('forbidden'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'อนุมัติ' }));

    expect(await screen.findByText('อัปเดตรายการไม่สำเร็จ')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'อนุมัติ' })).toBeTruthy();
  });

  it('shows its own loading state', () => {
    leaveRequests.mockImplementationOnce(() => new Promise(() => undefined));
    renderPage();

    expect(screen.getByLabelText('กำลังโหลดคำขอลาพนักงาน')).toBeTruthy();
  });
});
