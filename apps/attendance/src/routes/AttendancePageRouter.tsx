import { AttendanceCheckInPage } from '../pages/AttendanceCheckInPage';
import { AttendanceDashboardPage } from '../pages/AttendanceDashboardPage';
import { AttendanceLeaveRequestPage } from '../pages/AttendanceLeaveRequestPage';
import { AttendanceWorkHistoryPage } from '../pages/AttendanceWorkHistoryPage';
import type { StaffPage } from '../types/attendance';

type AttendancePageRouterProps = {
  page: StaffPage;
  username: string;
  checkedIn: boolean;
  clock: string;
  onAttendanceAction: () => void;
  onLeaveSuccess: () => void;
  onPage: (page: StaffPage) => void;
};

export function AttendancePageRouter({
  page,
  username,
  checkedIn,
  clock,
  onAttendanceAction,
  onLeaveSuccess,
  onPage,
}: AttendancePageRouterProps) {
  switch (page) {
    case 'attendance':
      return (
        <AttendanceCheckInPage
          checkedIn={checkedIn}
          clock={clock}
          onAction={onAttendanceAction}
        />
      );
    case 'leave':
      return <AttendanceLeaveRequestPage onSuccess={onLeaveSuccess} />;
    case 'history':
      return <AttendanceWorkHistoryPage />;
    default:
      return (
        <AttendanceDashboardPage
          username={username}
          checkedIn={checkedIn}
          clock={clock}
          onAction={onAttendanceAction}
          onPage={onPage}
        />
      );
  }
}
