import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodayCard } from './AttendanceCards';

const staff = {
  role: 'cashier',
  branchName: 'อยุธยา',
  startsAt: '08:00',
  endsAt: '17:00',
};

describe('TodayCard', () => {
  it('shows the completed attendance status in the status card', () => {
    render(
      <TodayCard
        checkedIn={false}
        checkInAt="2026-09-07T08:00:00+07:00"
        checkOutAt="2026-09-07T17:00:00+07:00"
        staff={staff}
      />,
    );

    expect(screen.getByText('วันนี้เช็กอินและเช็กเอาต์ครบแล้ว')).toBeTruthy();
  });
});
