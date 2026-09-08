import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeCard, TodayCard } from './AttendanceCards';

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

describe('TimeCard', () => {
  it('runs the attendance action and switches to checkout wording after check-in', () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <TimeCard
        clock="08:00:00"
        checkedIn={false}
        onAction={onAction}
        disabled={false}
        actionHint=""
        actionDisabledLabel="ลงเวลาวันนี้ครบแล้ว"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'เช็กอินเข้างาน' }));
    expect(onAction).toHaveBeenCalledOnce();

    rerender(
      <TimeCard
        clock="08:01:00"
        checkedIn
        onAction={onAction}
        disabled={false}
        actionHint=""
        actionDisabledLabel="ลงเวลาวันนี้ครบแล้ว"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'เช็กเอาต์เลิกงาน' }),
    ).toBeTruthy();
  });

  it('prevents an unavailable attendance action and explains why', () => {
    const onAction = vi.fn();
    render(
      <TimeCard
        clock="08:00:00"
        checkedIn={false}
        onAction={onAction}
        disabled
        actionHint="วันนี้เป็นวันหยุดตามตารางกะ"
        actionDisabledLabel="วันนี้เป็นวันหยุด"
      />,
    );

    const button = screen.getByRole('button', { name: 'วันนี้เป็นวันหยุด' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText('วันนี้เป็นวันหยุดตามตารางกะ')).toBeTruthy();
  });
});
