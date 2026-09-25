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
  checkOut,
  getAttendanceStatus,
  getAttendanceSummary,
  logoutAttendance,
  restoreAttendanceSession,
} from '../api/attendance';
import { ApiRequestError } from '../api/client';
import { requestAttendanceLocation } from '../lib/attendanceLocation';
import App from '../App';

vi.mock('@stackbuild/ui', () => ({
  SbcThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  ActionSnackbar: ({ notice }: { notice: { message: string } | null }) => (
    <output>{notice?.message}</output>
  ),
  ConnectionRetrySnackbar: () => null,
  BadgeAlertIcon: () => <span aria-hidden="true" />,
  CircleCheckIcon: () => <span aria-hidden="true" />,
  tabletOrSmallerMediaQuery: '(max-width:899.95px)',
  snackbarAnchorOrigin: (isTabletOrSmaller: boolean) => ({
    vertical: isTabletOrSmaller ? 'top' : 'bottom',
    horizontal: 'center',
  }),
  snackbarBelowTopbarSx: {},
  snackbarBottomSx: {},
}));
vi.mock('../components/AttendanceNavigation', () => ({
  attendanceNavigation: [{ page: 'overview', label: 'ภาพรวม' }],
}));
vi.mock('../hooks/useAttendanceClock', () => ({
  useAttendanceClock: () => '08:00',
}));
vi.mock('../components/AutoRetrySnackbar', () => ({
  AutoRetrySnackbar: ({ open }: { open: boolean }) => (
    <output data-testid="attendance-retry-open">{String(open)}</output>
  ),
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
vi.mock('../lib/attendanceLocation', () => ({
  requestAttendanceLocation: vi.fn().mockResolvedValue({
    latitude: 16.821085,
    longitude: 100.2694448,
    accuracyM: 8,
  }),
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
    attendanceActionDisabledLabel,
    onAttendanceAction,
    page,
    summary,
  }: {
    attendanceActionDisabled: boolean;
    attendanceActionHint: string;
    attendanceActionDisabledLabel: string;
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
      <span data-testid="attendance-action-disabled-label">
        {attendanceActionDisabledLabel}
      </span>
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

  it('returns to login when loading attendance data rejects an expired session with 401', async () => {
    vi.mocked(getAttendanceStatus).mockRejectedValueOnce(
      new ApiRequestError('เซสชันใช้งานไม่ได้', 401),
    );

    render(<App />);

    expect(await screen.findByText('attendance-login')).toBeTruthy();
  });

  it('keeps the session when loading attendance data is forbidden with 403', async () => {
    vi.mocked(getAttendanceStatus).mockRejectedValueOnce(
      new ApiRequestError('ไม่มีสิทธิ์ดูข้อมูล', 403),
    );

    render(<App />);

    expect(await screen.findByText('attendance-router')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('attendance-retry-open').textContent).toBe(
        'true',
      );
    });
    expect(screen.queryByText('attendance-login')).toBeNull();
    expect(logoutAttendance).not.toHaveBeenCalled();
  });

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

  it('does not submit a check-in when the action is disabled by the schedule', async () => {
    render(<App />);
    await screen.findByText('attendance-router');
    await waitFor(() =>
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'true',
      ),
    );

    // The route normally disables this button; invoke its callback through the
    // test route to also protect against stale or programmatic UI events.
    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    expect(checkIn).not.toHaveBeenCalled();
    expect(checkOut).not.toHaveBeenCalled();
  });

  it('keeps an existing check-in available when checkout fails transiently', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: true,
      checkInAt: '2026-09-08T01:00:00Z',
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkOut).mockRejectedValueOnce(new Error('network unavailable'));

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => expect(checkOut).toHaveBeenCalledOnce());
    expect(screen.getByText('attendance-router')).toBeTruthy();
    expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
      'false',
    );
    expect(checkIn).not.toHaveBeenCalled();
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
    expect(requestAttendanceLocation).toHaveBeenCalledOnce();
    expect(checkIn).toHaveBeenCalledWith({
      latitude: 16.821085,
      longitude: 100.2694448,
      accuracyM: 8,
    });
  });

  it('checks out an already checked-in staff member and prevents another action', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: true,
      checkInAt: '2026-09-08T01:00:00Z',
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkOut).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: '2026-09-08T01:00:00Z',
      checkOutAt: '2026-09-08T09:00:00Z',
      shiftStatus: 'scheduled',
      canRecordAttendance: false,
    });

    render(<App />);
    await screen.findByText('attendance-router');
    await waitFor(() => {
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => {
      expect(checkOut).toHaveBeenCalledOnce();
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'true',
      );
    });
    expect(checkIn).not.toHaveBeenCalled();
    expect(checkOut).toHaveBeenCalledWith({
      latitude: 16.821085,
      longitude: 100.2694448,
      accuracyM: 8,
    });
  });

  it('offers checkout for an overnight shift whose work date is yesterday', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-23',
      checkedIn: true,
      checkInAt: '2026-09-23T16:00:00Z',
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkOut).mockResolvedValueOnce({
      date: '2026-09-23',
      checkedIn: false,
      checkInAt: '2026-09-23T16:00:00Z',
      checkOutAt: '2026-09-24T00:00:00Z',
      shiftStatus: 'scheduled',
      canRecordAttendance: false,
    });

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => expect(checkOut).toHaveBeenCalledOnce());
    expect(checkIn).not.toHaveBeenCalled();
  });

  it('rejects another attendance action after a completed checkout even if a stale status says it can record', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: '2026-09-08T01:00:00Z',
      checkOutAt: '2026-09-08T09:00:00Z',
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });

    render(<App />);
    await waitFor(() =>
      expect(
        screen.getByTestId('attendance-action-disabled-label').textContent,
      ).toBe('ลงเวลาวันนี้ครบแล้ว'),
    );
    expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    expect(checkIn).not.toHaveBeenCalled();
    expect(checkOut).not.toHaveBeenCalled();
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

  it('keeps the local session when check-in is rejected by attendance rules', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: null,
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkIn).mockRejectedValueOnce(
      new ApiRequestError('คุณอยู่นอกรัศมีลงเวลา', 403),
    );

    render(<App />);
    await screen.findByText('attendance-router');
    await waitFor(() => {
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    expect(await screen.findByText('attendance-router')).toBeTruthy();
    expect(await screen.findByText('คุณอยู่นอกรัศมีลงเวลา')).toBeTruthy();
    expect(logoutAttendance).not.toHaveBeenCalled();
  });

  it('keeps the local session when checkout is rejected by attendance rules', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: true,
      checkInAt: '2026-09-08T01:00:00Z',
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkOut).mockRejectedValueOnce(
      new ApiRequestError('คุณอยู่นอกรัศมีลงเวลา', 403),
    );

    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    expect(await screen.findByText('attendance-router')).toBeTruthy();
    expect(await screen.findByText('คุณอยู่นอกรัศมีลงเวลา')).toBeTruthy();
    expect(checkOut).toHaveBeenCalledOnce();
    expect(checkIn).not.toHaveBeenCalled();
    expect(logoutAttendance).not.toHaveBeenCalled();
  });

  it('keeps the staff session and attendance action available when check-in has a recoverable error', async () => {
    vi.mocked(getAttendanceStatus).mockResolvedValueOnce({
      date: '2026-09-08',
      checkedIn: false,
      checkInAt: null,
      checkOutAt: null,
      shiftStatus: 'scheduled',
      canRecordAttendance: true,
    });
    vi.mocked(checkIn).mockRejectedValueOnce(new Error('network unavailable'));

    render(<App />);
    expect(await screen.findByText('attendance-router')).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'record-attendance' }));

    await waitFor(() => expect(checkIn).toHaveBeenCalledOnce());
    expect(screen.getByText('attendance-router')).toBeTruthy();
    expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
      'false',
    );
    expect(logoutAttendance).not.toHaveBeenCalled();
  });

  it('restores the current page from the URL after a refresh', async () => {
    window.history.replaceState(null, '', '/history');

    render(<App />);

    expect((await screen.findByTestId('attendance-page')).textContent).toBe(
      'history',
    );
  });

  it('keeps the session and reloads attendance data when the connection returns', async () => {
    const onlineListenerSpy = vi.spyOn(window, 'addEventListener');
    vi.mocked(getAttendanceStatus)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        date: '2026-09-08',
        checkedIn: false,
        checkInAt: null,
        checkOutAt: null,
        shiftStatus: 'scheduled',
        canRecordAttendance: true,
      });

    render(<App />);
    await screen.findByText('attendance-router');
    await waitFor(() =>
      expect(screen.getByTestId('attendance-retry-open').textContent).toBe(
        'true',
      ),
    );
    await waitFor(() =>
      expect(onlineListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function),
      ),
    );

    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(getAttendanceStatus).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('attendance-retry-open').textContent).toBe(
        'false',
      );
      expect(screen.getByTestId('attendance-action-disabled').textContent).toBe(
        'false',
      );
    });
    onlineListenerSpy.mockRestore();
  });
});
