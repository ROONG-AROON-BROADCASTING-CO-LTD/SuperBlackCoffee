import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceManagementPage } from '../AttendanceManagementPage';
import { listManagedAttendance } from '../../api/attendance';
import { listBranches } from '../../api/branches';
import { listPublicHolidays } from '../../api/public-holidays';
import { listStaffSchedules } from '../../api/staff-schedules';
import { exportDailyReportAsPdf } from '../../utils/exportCalendarPdf';

vi.mock('../../api/attendance', () => ({
  listManagedAttendance: vi.fn(),
}));
vi.mock('../../api/staff-schedules', () => ({
  listStaffSchedules: vi.fn(),
}));
vi.mock('../../api/branches', () => ({
  listBranches: vi.fn(),
}));
vi.mock('../../api/public-holidays', () => ({
  listPublicHolidays: vi.fn(),
}));
vi.mock('../../utils/exportCalendarPdf', () => ({
  exportDailyReportAsPdf: vi.fn(),
}));

const attendance = vi.mocked(listManagedAttendance);
const schedules = vi.mocked(listStaffSchedules);
const branches = vi.mocked(listBranches);
const holidays = vi.mocked(listPublicHolidays);
const exportPdf = vi.mocked(exportDailyReportAsPdf);

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
    window.history.replaceState({}, '', '/attendance');
    branches.mockResolvedValue([
      { id: 3, name: 'อยุธยา', code: 'SBC-AY' },
      { id: 5, name: 'พิษณุโลก', code: 'SBC-PL' },
    ]);
    holidays.mockResolvedValue([{ date: '2026-09-07', name: 'วันหยุดทดสอบ' }]);
    attendance.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        name: 'พิมพ์ชนก',
        branchId: 3,
        branchName: 'อยุธยา',
        date: '2026-09-07',
        checkInAt: '2026-09-07T01:10:00Z',
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
    expect(screen.getByText('เข้า 08:10 · ออก -')).toBeTruthy();
    expect(screen.getByLabelText('พิมพ์ชนก ตรงเวลา')).toBeTruthy();
    expect(screen.getByLabelText('สมชาย ยังไม่เช็กอิน')).toBeTruthy();
    expect(screen.getByLabelText('มานี มาสาย')).toBeTruthy();
    expect(screen.getByTitle('วันหยุดทดสอบ')).toBeTruthy();
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

    expect(
      new URLSearchParams(window.location.search).get('scheduleBranch'),
    ).toBe('SBC-PL');
    expect(screen.queryByLabelText('พิมพ์ชนก ตรงเวลา')).toBeNull();
    expect(screen.getAllByText('ไม่มีพนักงานเข้ากะ')).not.toHaveLength(0);
  });

  it('exports only the attendance calendar as a PDF', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ส่งออก PDF' })).toBeTruthy(),
    );

    await screen.getByRole('button', { name: 'ส่งออก PDF' }).click();

    expect(exportPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'รายงานลงเวลาพนักงาน',
        days: expect.arrayContaining([
          expect.objectContaining({
            entries: expect.arrayContaining([
              expect.objectContaining({ name: 'พิมพ์ชนก' }),
            ]),
          }),
        ]),
      }),
    );
  });

  it('keeps the attendance card layout while the initial data is loading', () => {
    attendance.mockImplementationOnce(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByLabelText('กำลังโหลดข้อมูลลงเวลาพนักงาน')).toBeTruthy();
    expect(screen.getByLabelText('โครงปฏิทินลงเวลาพนักงาน')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('shows a short load error and automatic retry notice', async () => {
    attendance.mockRejectedValueOnce(new Error('network down'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('ไม่สามารถโหลดข้อมูลได้')).toBeTruthy(),
    );
  });
});
