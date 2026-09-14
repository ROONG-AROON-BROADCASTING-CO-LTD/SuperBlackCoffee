import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AttendanceHistoryList } from './AttendanceHistoryList';

describe('AttendanceHistoryList', () => {
  afterEach(cleanup);

  it('calculates completed working time from check-in to check-out', () => {
    render(
      <AttendanceHistoryList
        history={[
          {
            date: '2026-09-14',
            checkInAt: '2026-09-14T08:15:00+07:00',
            checkOutAt: '2026-09-14T17:00:00+07:00',
          },
        ]}
      />,
    );

    expect(screen.getByText('8 ชม. 45 นาที')).toBeTruthy();
  });

  it('does not show a negative duration for malformed attendance timestamps', () => {
    render(
      <AttendanceHistoryList
        history={[
          {
            date: '2026-09-14',
            checkInAt: '2026-09-14T17:00:00+07:00',
            checkOutAt: '2026-09-14T08:00:00+07:00',
          },
        ]}
      />,
    );

    expect(screen.getByText('0 ชม. 0 นาที')).toBeTruthy();
  });
});
