import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttendancePageRouter } from '../AttendancePageRouter';

vi.mock('../../components/skeletons/AttendanceCheckInSkeleton', () => ({
  AttendanceCheckInSkeleton: () => <div>check-in-skeleton</div>,
}));
vi.mock('../../components/skeletons/AttendanceLeaveRequestSkeleton', () => ({
  AttendanceLeaveRequestSkeleton: () => <div>leave-skeleton</div>,
}));
vi.mock('../../components/skeletons/AttendanceOverviewSkeleton', () => ({
  AttendanceOverviewSkeleton: () => <div>overview-skeleton</div>,
}));
vi.mock('../../components/skeletons/AttendanceWorkHistorySkeleton', () => ({
  AttendanceWorkHistorySkeleton: () => <div>history-skeleton</div>,
}));
vi.mock('../../pages/AttendanceCheckInPage', () => ({
  AttendanceCheckInPage: ({
    checkedIn,
    attendanceActionDisabled,
  }: {
    checkedIn: boolean;
    attendanceActionDisabled: boolean;
  }) => (
    <div data-testid="check-in-page">
      {String(checkedIn)}:{String(attendanceActionDisabled)}
    </div>
  ),
}));
vi.mock('../../pages/AttendanceDashboardPage', () => ({
  AttendanceDashboardPage: ({ username }: { username: string }) => (
    <div data-testid="overview-page">{username}</div>
  ),
}));
vi.mock('../../pages/AttendanceLeaveRequestPage', () => ({
  AttendanceLeaveRequestPage: () => <div data-testid="leave-page" />,
}));
vi.mock('../../pages/AttendanceWorkHistoryPage', () => ({
  AttendanceWorkHistoryPage: ({ history }: { history: unknown[] }) => (
    <div data-testid="history-page">{history.length}</div>
  ),
}));

const baseProps = {
  username: 'พนักงานทดสอบ',
  staff: {
    id: 7,
    name: 'พนักงานทดสอบ',
    role: 'cashier',
    branchId: 2,
    branchName: 'อยุธยา',
    startsAt: '08:00',
    endsAt: '17:00',
  },
  checkedIn: true,
  checkInAt: '2026-09-21T08:00:00+07:00',
  checkOutAt: null,
  attendanceActionDisabled: false,
  attendanceActionHint: '',
  attendanceActionDisabledLabel: 'ยังไม่สามารถลงเวลาได้',
  clock: '08:30:00',
  onAttendanceAction: vi.fn(),
  onLeaveSuccess: vi.fn(),
  history: [
    {
      date: '2026-09-20',
      checkInAt: '2026-09-20T08:00:00+07:00',
      checkOutAt: '2026-09-20T17:00:00+07:00',
    },
  ],
  summary: {
    month: '2026-09',
    sickLeaveCount: 0,
    personalLeaveCount: 0,
    otherLeaveCount: 0,
    lateCount: 0,
  },
};

describe('AttendancePageRouter', () => {
  afterEach(cleanup);

  it('keeps the page-specific skeleton visible while initial data is loading', () => {
    render(
      <AttendancePageRouter {...baseProps} page="history" isInitialLoading />,
    );

    expect(screen.getByText('history-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('history-page')).toBeNull();
  });

  it.each([
    ['overview', 'overview-page', 'พนักงานทดสอบ'],
    ['attendance', 'check-in-page', 'true:false'],
    ['leave', 'leave-page', ''],
    ['history', 'history-page', '1'],
  ] as const)('routes %s to the expected page', async (page, testId, text) => {
    render(
      <AttendancePageRouter
        {...baseProps}
        page={page}
        isInitialLoading={false}
      />,
    );

    const routedPage = await screen.findByTestId(testId);
    expect(routedPage.textContent).toBe(text);
  });
});
