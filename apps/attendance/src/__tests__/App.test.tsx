import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkIn,
  getAttendanceStatus,
  getAttendanceSummary,
  logoutAttendance,
  restoreAttendanceSession,
} from '../api/attendance';
import { ApiRequestError } from '../api/client';
import App from '../App';

vi.mock('@stackbuild/ui', () => ({
  SbcThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  BadgeAlertIcon: () => <span aria-hidden="true" />,
}));
vi.mock('../components/AttendanceNavigation', () => ({
  attendanceNavigation: [{ page: 'overview', label: 'ภาพรวม' }],
}));
vi.mock('../hooks/useAttendanceClock', () => ({
  useAttendanceClock: () => '08:00',
}));
vi.mock('../api/attendance', () => ({
  getAttendanceStatus: vi.fn().mockResolvedValue({
    checkedIn: false,
    shiftStatus: 'day_off',
    canRecordAttendance: false,
  }),
  getAttendanceSummary: vi.fn().mockResolvedValue({
    sickLeaveCount: 0,
    personalLeaveCount: 0,
    otherLeaveCount: 0,
    lateCount: 0,
  }),
  getAttendanceHistory: vi.fn().mockResolvedValue([]),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
  createLeaveRequest: vi.fn(),
  loginAttendance: vi.fn(),
  logoutAttendance: vi.fn().mockResolvedValue(undefined),
  restoreAttendanceSession: vi.fn().mockResolvedValue({
    user: {
      id: 1,
      name: 'พนักงาน',
      role: 'cashier',
      branchId: 1,
      branchName: 'อยุธยา',
      startsAt: '08:00',
      endsAt: '17:00',
    },
  }),
  setupAttendancePIN: vi.fn(),
}));
vi.mock('../features/auth/AttendanceLoginPage', () => ({
  AttendanceLoginPage: () => <div>attendance-login</div>,
}));
vi.mock('../layouts/AttendanceAppLayout', () => ({
  AttendanceAppLayout: ({
    children,
    onLogout,
  }: {
    children: React.ReactNode;
    onLogout: () => void;
  }) => (
    <>
      <button onClick={onLogout}>attendance-logout</button>
      {children}
    </>
  ),
}));
vi.mock('../routes/AttendancePageRouter', () => ({
  AttendancePageRouter: ({
    attendanceActionDisabled,
    attendanceActionHint,
    onAttendanceAction,
    page,
    summary,
  }: {
    attendanceActionDisabled: boolean;
    attendanceActionHint: string;
    onAttendanceAction: () => void;
    page: string;
    summary: { lateCount: number } | null;
  }) => (
    <div>
      attendance-router
      <button onClick={onAttendanceAction}>record-attendance</button>
      <span data-testid="attendance-action-disabled">
        {String(attendanceActionDisabled)}
      </span>
      <span data-testid="attendance-action-hint">{attendanceActionHint}</span>
      <span data-testid="attendance-page">{page}</span>
      <span data-testid="attendance-late-count">{summary?.lateCount ?? 0}</span>
    </div>
  ),
}));

describe('Attendance App session', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });
  it('restores the HttpOnly cookie session and logs out', async () => {
    render(<App />);
    expect(await screen.findByText('attendance-router')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'attendance-logout' }));
    await waitFor(() => {
      expect(screen.getByText('attendance-login')).toBeTruthy();
    });
    expect(logoutAttendance).toHaveBeenCalledOnce();
  });

  it('shows login when the HttpOnly attendance session cannot be restored', async () => {
    vi.mocked(restoreAttendanceSession).mockRejectedValueOnce(
      new Error('เซสชันหมดอายุ'),
    );

    render(<App />);

    expect(await screen.findByText('attendance-login')).toBeTruthy();
  });

  it.each([401, 403])(
    'returns to login when loading attendance data rejects the session with %i',
    async (status) => {
      vi.mocked(getAttendanceStatus).mockRejectedValueOnce(
        new ApiRequestError('เซสชันใช้งานไม่ได้', status),
      );

      render(<App />);

      expect(await screen.findByText('attendance-login')).toBeTruthy();
    },
  );

  it('disables attendance actions when today is a day off', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'true',
      );
      expect(screen.getByTestId('attendance-action-hint').textContent).toBe(
        'วันนี้เป็นวันหยุดตามตารางกะ',
      );
    });
  });

  it('refreshes the monthly late count after checking in', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: null,
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(getAttendanceSummary)
      .mockResolvedValueOnce({
        month: '2026-09',
        sickLeaveCount: 0,
        personalLeaveCount: 0,
        otherLeaveCount: 0,
        lateCount: 1,
      })
      .mockResolvedValueOnce({
        month: '2026-09',
        sickLeaveCount: 0,
        personalLeaveCount: 0,
        otherLeaveCount: 0,
        lateCount: 2,
      });
    vi.mocked(checkIn).mockResolvedValueOnce({
      date: '2026-09-08',
      checkInAt: '2026-09-08T02:19:58Z',
      checkOutAt: null,
      checkedIn: true,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('attendance-late-count').textContent).toBe('1');
    });
    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => {
      expect(screen.getByTestId('attendance-late-count').textContent).toBe('2');
    });
  });

  it('ends the local session when the check-in request reports an expired cookie', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: null,
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkIn).mockRejectedValueOnce(
      new ApiRequestError('เซสชันใช้งานไม่ได้', 401),
    );

    render(<App />);
    expect(await screen.findByText('attendance-router')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => {
      expect(screen.getByText('attendance-login')).toBeTruthy();
    });
    expect(logoutAttendance).toHaveBeenCalledOnce();
  });

  it('ends the local session when check-in is forbidden after the session changes', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: null,
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkIn).mockRejectedValueOnce(
      new ApiRequestError('เซสชันใช้งานไม่ได้', 403),
    );

    render(<App />);
    await screen.findByText('attendance-router');
    await waitFor(() => {
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => {
      expect(screen.getByText('attendance-login')).toBeTruthy();
    });
    expect(logoutAttendance).toHaveBeenCalledOnce();
  });

  it('restores the current page from the URL after a refresh', async () => {
    window.history.replaceState(null, '', '/history');

    render(<App />);

    expect((await screen.findByTestId('attendance-page')).textContent).toBe(
      'history',
    );
  });
});
