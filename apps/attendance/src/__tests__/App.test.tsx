import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  getAttendanceStatus: vi.fn().mockResolvedValue({ checkedIn: false }),
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
  AttendancePageRouter: () => <div>attendance-router</div>,
}));

describe('Attendance App session', () => {
  beforeEach(() => {
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
  });
  it('restores a cookie-backed session without an access token and logs out', () => {
    render(<App />);
    expect(screen.getByText('attendance-router')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'attendance-logout' }));
    expect(screen.getByText('attendance-login')).toBeTruthy();
    expect(sessionStorage.getItem('sbc-staff-session')).toBeNull();
  });
});
