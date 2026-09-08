import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceManagementPage } from '../AttendanceManagementPage';
import { listManagedAttendance } from '../../api/attendance';
import { listBranches } from '../../api/branches';
import { listStaffSchedules } from '../../api/staff-schedules';

vi.mock('../../api/attendance', () => ({
  listManagedAttendance: vi.fn(),
}));
vi.mock('../../api/staff-schedules', () => ({
  listStaffSchedules: vi.fn(),
}));
vi.mock('../../api/branches', () => ({
  listBranches: vi.fn(),
}));

const attendance = vi.mocked(listManagedAttendance);
const schedules = vi.mocked(listStaffSchedules);
const branches = vi.mocked(listBranches);

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
    branches.mockResolvedValue([
      { id: 3, name: 'อยุธยา', code: 'SBC-AY' },
      { id: 5, name: 'พิษณุโลก', code: 'SBC-PL' },
    ]);
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
      {
        id: 2,
        userId: 4,
        name: 'มานี',
        branchId: 3,
        branchName: 'อยุธยา',
        date: '2026-09-08',
        checkInAt: '2026-09-08T02:30:00Z',
        checkOutAt: null,
      },
    ]);
    schedules.mockResolvedValue([
      {
        id: 11,
        userId: 2,
        name: 'พิมพ์ชนก',
        branchId: 3,
        date: '2026-09-07',
        startsAt: '08:00:00',
        endsAt: '17:00:00',
        status: 'scheduled',
      },
      {
        id: 12,
        userId: 3,
        name: 'สมชาย',
        branchId: 3,
        date: '2026-09-07',
        startsAt: '08:00:00',
        endsAt: '17:00:00',
        status: 'scheduled',
      },
      {
        id: 13,
        userId: 4,
        name: 'มานี',
        branchId: 3,
        date: '2026-09-08',
        startsAt: '08:00:00',
        endsAt: '17:00:00',
        status: 'scheduled',
      },
    ]);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows every scheduled employee with on-time, late, and pending states', async () => {
    renderPage(true);
    await waitFor(() => expect(screen.getByText('พิมพ์ชนก')).toBeTruthy());
    expect(
      screen.getByText('ข้อมูลพนักงานในแฟรนไชส์ของคุณเท่านั้น'),
    ).toBeTruthy();
    expect(screen.getByText('วันจันทร์')).toBeTruthy();
    expect(screen.getByText('เข้า 08:00 · ออก -')).toBeTruthy();
    expect(screen.getByLabelText('พิมพ์ชนก ตรงเวลา')).toBeTruthy();
    expect(screen.getByLabelText('สมชาย ยังไม่เช็กอิน')).toBeTruthy();
    expect(screen.getByLabelText('มานี มาสาย')).toBeTruthy();
  });

  it('lets admins filter the calendar by branch like the staff schedule page', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'อยุธยา' })).toBeTruthy(),
    );
    expect(screen.getByText('แสดงตารางของสาขา')).toBeTruthy();
    expect(screen.getByText('สาขา')).toBeTruthy();
    expect(screen.getByLabelText('พิมพ์ชนก ตรงเวลา')).toBeTruthy();

    await screen.getByRole('button', { name: 'พิษณุโลก' }).click();

    expect(screen.queryByLabelText('พิมพ์ชนก ตรงเวลา')).toBeNull();
    expect(screen.getAllByText('ไม่มีพนักงานเข้ากะ')).not.toHaveLength(0);
  });

  it('keeps the attendance card layout while the initial data is loading', () => {
    attendance.mockImplementationOnce(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByLabelText('กำลังโหลดข้อมูลลงเวลาพนักงาน')).toBeTruthy();
  });

  it('shows a short load error and automatic retry notice', async () => {
    attendance.mockRejectedValueOnce(new Error('network down'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('ไม่สามารถโหลดข้อมูลได้')).toBeTruthy(),
    );
  });
});
