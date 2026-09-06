import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceManagementPage } from '../AttendanceManagementPage';
import {
  listManagedAttendance,
  listManagedLeaveRequests,
  updateManagedLeaveRequest,
} from '../../api/attendance';

vi.mock('../../api/attendance', () => ({
  listManagedAttendance: vi.fn(),
  listManagedLeaveRequests: vi.fn(),
  updateManagedLeaveRequest: vi.fn(),
}));

const attendance = vi.mocked(listManagedAttendance);
const leaveRequests = vi.mocked(listManagedLeaveRequests);
const updateLeave = vi.mocked(updateManagedLeaveRequest);

const renderPage = (franchiseMode = false) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AttendanceManagementPage franchiseMode={franchiseMode} />
    </QueryClientProvider>,
  );

describe('AttendanceManagementPage', () => {
  beforeEach(() => {
    attendance.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        name: 'พิมพ์ชนก',
        branchId: 3,
        branchName: 'อยุธยา',
        date: '2026-09-07',
        checkInAt: '2026-09-07T01:00:00Z',
        checkOutAt: null,
      },
    ]);
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

  it('shows only the current workspace label and its attendance records', async () => {
    renderPage(true);
    await waitFor(() => expect(screen.getByText('พิมพ์ชนก')).toBeTruthy());
    expect(
      screen.getByText('ข้อมูลพนักงานในแฟรนไชส์ของคุณเท่านั้น'),
    ).toBeTruthy();
    expect(screen.getByText('สาขาอยุธยา')).toBeTruthy();
  });

  it('keeps the attendance card layout while the initial data is loading', () => {
    attendance.mockImplementationOnce(() => new Promise(() => undefined));
    leaveRequests.mockImplementationOnce(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByLabelText('กำลังโหลดข้อมูลลงเวลาพนักงาน')).toBeTruthy();
  });

  it('approves a pending leave request', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'อนุมัติ' })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'อนุมัติ' }));
    await waitFor(() =>
      expect(updateLeave).toHaveBeenCalledWith(4, 'approved'),
    );
  });

  it('shows a short load error and automatic retry notice', async () => {
    attendance.mockRejectedValueOnce(new Error('network down'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('ไม่สามารถโหลดข้อมูลได้')).toBeTruthy(),
    );
  });
});
