import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AttendanceLeaveRequestPage } from '../AttendanceLeaveRequestPage';

describe('AttendanceLeaveRequestPage', () => {
  afterEach(() => cleanup());

  it('submits the selected leave type in the API format', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<AttendanceLeaveRequestPage onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'ลากิจ' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'เหตุผลการลา' }), {
      target: { value: 'ไปติดต่อราชการ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ส่งคำขอลา' }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith({
        leaveDate: '2026-09-07',
        leaveType: 'personal',
        reason: 'ไปติดต่อราชการ',
      }),
    );
  });

  it('does not allow an empty leave reason', () => {
    render(<AttendanceLeaveRequestPage onSuccess={vi.fn()} />);
    expect(
      (screen.getByRole('button', { name: 'ส่งคำขอลา' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
