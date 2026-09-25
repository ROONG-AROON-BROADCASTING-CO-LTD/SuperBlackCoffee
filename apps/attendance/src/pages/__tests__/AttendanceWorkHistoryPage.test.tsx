import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttendanceWorkHistoryPage } from '../AttendanceWorkHistoryPage';

vi.mock('../../components/MyLeaveRequests', () => ({
  MyLeaveRequests: () => <div>รายการใบลาของฉัน</div>,
}));

describe('AttendanceWorkHistoryPage', () => {
  afterEach(cleanup);

  it('opens on attendance history and switches to leave documents', () => {
    render(
      <AttendanceWorkHistoryPage
        history={[
          {
            date: '2026-09-25',
            checkInAt: '2026-09-25T08:00:00+07:00',
            checkOutAt: '2026-09-25T17:00:00+07:00',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'ลงเวลา' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByText('เช็กอิน')).toBeTruthy();
    expect(screen.queryByText('รายการใบลาของฉัน')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'ใบลา' }));

    expect(
      screen.getByRole('tab', { name: 'ใบลา' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByText('รายการใบลาของฉัน')).toBeTruthy();
    expect(screen.queryByText('เช็กอิน')).toBeNull();
  });
});
