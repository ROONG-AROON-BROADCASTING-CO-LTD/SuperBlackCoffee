import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    page,
  }: {
    attendanceActionDisabled: boolean;
    attendanceActionHint: string;
    page: string;
  }) => (
    <div>
      attendance-router
      <span data-testid="attendance-action-disabled">
        {String(attendanceActionDisabled)}
      </span>
      <span data-testid="attendance-action-hint">{attendanceActionHint}</span>
      <span data-testid="attendance-page">{page}</span>
    </div>
  ),
}));

describe('Attendance App session', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.setItem(
      'sbc-staff-session',
      JSON.stringify({
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
    );
  });
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });
  it('restores a cookie-backed session without an access token and logs out', async () => {
    render(<App />);
    expect(screen.getByText('attendance-router')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'attendance-logout' }));
    await waitFor(() => {
      expect(screen.getByText('attendance-login')).toBeTruthy();
    });
    expect(sessionStorage.getItem('sbc-staff-session')).toBeNull();
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

  it('restores the current page from the URL after a refresh', () => {
    window.history.replaceState(null, '', '/history');

    render(<App />);

    expect(screen.getByTestId('attendance-page').textContent).toBe('history');
  });
});
