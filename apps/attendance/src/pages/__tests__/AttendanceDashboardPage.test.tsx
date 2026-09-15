import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AttendanceDashboardPage } from '../AttendanceDashboardPage';

describe('AttendanceDashboardPage', () => {
  afterEach(cleanup);

  it('shows every monthly attendance total for the signed-in employee', () => {
    render(
      <AttendanceDashboardPage
        username="มิน"
        summary={{
          month: '2026-09',
          sickLeaveCount: 1,
          personalLeaveCount: 2,
          otherLeaveCount: 3,
          lateCount: 4,
        }}
      />,
    );

    expect(screen.getByText('สวัสดี มิน')).toBeTruthy();
    expect(screen.getByText('ลาป่วย')).toBeTruthy();
    expect(screen.getByText('ลากิจ')).toBeTruthy();
    expect(screen.getByText('ลาอื่น ๆ')).toBeTruthy();
    expect(screen.getByText('มาสาย')).toBeTruthy();
    [1, 2, 3, 4].forEach((value) =>
      expect(screen.getByText(String(value))).toBeTruthy(),
    );
  });

  it('uses an explicit unavailable value while the monthly summary is absent', () => {
    render(<AttendanceDashboardPage username="มิน" summary={null} />);

    expect(screen.getAllByText('-')).toHaveLength(4);
    expect(screen.queryByText('0')).toBeNull();
  });
});
