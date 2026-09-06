import { AttendanceCheckInPage } from '../pages/AttendanceCheckInPage';
import { AttendanceDashboardPage } from '../pages/AttendanceDashboardPage';
import { AttendanceLeaveRequestPage } from '../pages/AttendanceLeaveRequestPage';
import { AttendanceWorkHistoryPage } from '../pages/AttendanceWorkHistoryPage';
import type {
  AttendanceHistoryItem,
  AttendanceSession,
} from '../api/attendance';
import type { StaffPage } from '../types/attendance';

type AttendancePageRouterProps = {
  page: StaffPage;
  username: string;
  staff: AttendanceSession['user'];
  checkedIn: boolean;
  checkInAt: string | null;
  clock: string;
  onAttendanceAction: () => void;
  onLeaveSuccess: (input: {
    leaveDate: string;
    leaveType: 'sick' | 'personal' | 'other';
    reason: string;
  }) => Promise<void>;
  history: AttendanceHistoryItem[];
  onPage: (page: StaffPage) => void;
};

export function AttendancePageRouter({
  page,
  username,
  staff,
  checkedIn,
  checkInAt,
  clock,
  onAttendanceAction,
  onLeaveSuccess,
  onPage,
  history,
}: AttendancePageRouterProps) {
  switch (page) {
    case 'attendance':
      return (
        <AttendanceCheckInPage
          checkedIn={checkedIn}
          checkInAt={checkInAt}
          staff={staff}
          clock={clock}
          onAction={onAttendanceAction}
        />
      );
    case 'leave':
      return <AttendanceLeaveRequestPage onSuccess={onLeaveSuccess} />;
    case 'history':
      return <AttendanceWorkHistoryPage history={history} />;
    default:
      return (
        <AttendanceDashboardPage
          username={username}
          staff={staff}
          checkedIn={checkedIn}
          checkInAt={checkInAt}
          clock={clock}
          onAction={onAttendanceAction}
          onPage={onPage}
          history={history}
        />
      );
  }
}
