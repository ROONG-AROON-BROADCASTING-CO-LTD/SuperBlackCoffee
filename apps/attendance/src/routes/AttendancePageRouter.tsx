import { lazy, Suspense } from 'react';
import { AttendanceCheckInSkeleton } from '../components/skeletons/AttendanceCheckInSkeleton';
import { AttendanceLeaveRequestSkeleton } from '../components/skeletons/AttendanceLeaveRequestSkeleton';
import { AttendanceOverviewSkeleton } from '../components/skeletons/AttendanceOverviewSkeleton';
import { AttendanceWorkHistorySkeleton } from '../components/skeletons/AttendanceWorkHistorySkeleton';
import type {
  AttendanceHistoryItem,
  AttendanceSession,
  AttendanceSummary,
} from '../api/attendance';
import type { StaffPage } from '../types/attendance';

const AttendanceCheckInPage = lazy(() =>
  import('../pages/AttendanceCheckInPage').then(
    ({ AttendanceCheckInPage: Page }) => ({ default: Page }),
  ),
);
const AttendanceDashboardPage = lazy(() =>
  import('../pages/AttendanceDashboardPage').then(
    ({ AttendanceDashboardPage: Page }) => ({ default: Page }),
  ),
);
const AttendanceLeaveRequestPage = lazy(() =>
  import('../pages/AttendanceLeaveRequestPage').then(
    ({ AttendanceLeaveRequestPage: Page }) => ({ default: Page }),
  ),
);
const AttendanceWorkHistoryPage = lazy(() =>
  import('../pages/AttendanceWorkHistoryPage').then(
    ({ AttendanceWorkHistoryPage: Page }) => ({ default: Page }),
  ),
);

const pageSkeletons = {
  overview: <AttendanceOverviewSkeleton />,
  attendance: <AttendanceCheckInSkeleton />,
  leave: <AttendanceLeaveRequestSkeleton />,
  history: <AttendanceWorkHistorySkeleton />,
};

type AttendancePageRouterProps = {
  page: StaffPage;
  username: string;
  staff: AttendanceSession['user'];
  checkedIn: boolean;
  checkInAt: string | null;
  attendanceActionDisabled: boolean;
  attendanceActionHint: string;
  attendanceActionDisabledLabel: string;
  clock: string;
  onAttendanceAction: () => void;
  onLeaveSuccess: (input: {
    leaveDate: string;
    leaveType: 'sick' | 'personal' | 'other';
    reason: string;
  }) => Promise<void>;
  history: AttendanceHistoryItem[];
  summary: AttendanceSummary | null;
  isInitialLoading: boolean;
};

export function AttendancePageRouter({
  page,
  username,
  staff,
  checkedIn,
  checkInAt,
  attendanceActionDisabled,
  attendanceActionHint,
  attendanceActionDisabledLabel,
  clock,
  onAttendanceAction,
  onLeaveSuccess,
  history,
  summary,
  isInitialLoading,
}: AttendancePageRouterProps) {
  if (isInitialLoading) {
    return pageSkeletons[page];
  }

  let content;
  switch (page) {
    case 'attendance':
      content = (
        <AttendanceCheckInPage
          checkedIn={checkedIn}
          checkInAt={checkInAt}
          staff={staff}
          clock={clock}
          onAction={onAttendanceAction}
          attendanceActionDisabled={attendanceActionDisabled}
          attendanceActionHint={attendanceActionHint}
          attendanceActionDisabledLabel={attendanceActionDisabledLabel}
        />
      );
      break;
    case 'leave':
      content = <AttendanceLeaveRequestPage onSuccess={onLeaveSuccess} />;
      break;
    case 'history':
      content = <AttendanceWorkHistoryPage history={history} />;
      break;
    default:
      content = (
        <AttendanceDashboardPage username={username} summary={summary} />
      );
  }

  return <Suspense fallback={pageSkeletons[page]}>{content}</Suspense>;
}
