import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelLeaveRequest, listMyLeaveRequests } from '../../api/attendance';
import { AttendanceLeaveRequestPage } from '../AttendanceLeaveRequestPage';

vi.mock('../../api/attendance', () => ({
  cancelLeaveRequest: vi.fn(),
  getLeaveRequestPdf: vi.fn().mockResolvedValue(new Blob(['pdf'])),
  listMyLeaveRequests: vi.fn().mockResolvedValue([]),
}));

describe('AttendanceLeaveRequestPage', () => {
  afterEach(() => cleanup());

  it('submits the selected leave type in the API format', async () => {
    const onSuccess = vi.fn().mockResolvedValue({ id: 1, status: 'pending' });
    render(<AttendanceLeaveRequestPage onSuccess={onSuccess} />);
    const leaveDate = (
      screen.getByLabelText('ตั้งแต่วันที่') as HTMLInputElement
    ).value;
    const leaveEndDate = new Date(`${leaveDate}T00:00:00Z`);
    leaveEndDate.setUTCDate(leaveEndDate.getUTCDate() + 1);

    fireEvent.click(screen.getByRole('button', { name: 'ลากิจ' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'เหตุผลการลา' }), {
      target: { value: 'ไปติดต่อราชการ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'ส่งคำขอลาและสร้างใบลา PDF' }),
    );

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith({
        leaveDate,
        leaveEndDate: leaveEndDate.toISOString().slice(0, 10),
        leaveType: 'personal',
        reason: 'ไปติดต่อราชการ',
        contactPhone: '',
        additionalDetails: '',
        attachments: [],
      }),
    );
    expect(screen.getByText(`ใบลาหยุดงาน · ${leaveDate}`)).toBeTruthy();
  });

  it('does not allow an empty leave reason', () => {
    render(<AttendanceLeaveRequestPage onSuccess={vi.fn()} />);
    expect(
      (
        screen.getByRole('button', {
          name: 'ส่งคำขอลาและสร้างใบลา PDF',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('opens the calendar when the date field is clicked', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'showPicker',
    );
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPicker,
    });

    render(<AttendanceLeaveRequestPage onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('ตั้งแต่วันที่'));

    expect(showPicker).toHaveBeenCalledOnce();

    if (descriptor) {
      Object.defineProperty(
        HTMLInputElement.prototype,
        'showPicker',
        descriptor,
      );
    } else {
      delete (HTMLInputElement.prototype as { showPicker?: unknown })
        .showPicker;
    }
  });

  it('moves the end date to the next calendar day across a year boundary', () => {
    render(<AttendanceLeaveRequestPage onSuccess={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), {
      target: { value: '2026-12-31' },
    });

    expect((screen.getByLabelText('ถึงวันที่') as HTMLInputElement).value).toBe(
      '2027-01-01',
    );
  });

  it('confirms cancellation, deletes the request, and removes it from history', async () => {
    vi.mocked(listMyLeaveRequests).mockResolvedValueOnce([
      {
        id: 44,
        leaveDate: '2026-09-09',
        leaveEndDate: '2026-09-10',
        leaveType: 'sick',
        reason: 'ป่วย',
        contactPhone: '',
        additionalDetails: '',
        attachments: [],
        status: 'pending',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ]);
    vi.mocked(cancelLeaveRequest).mockResolvedValueOnce({ id: 44 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AttendanceLeaveRequestPage onSuccess={vi.fn()} />);
    await screen.findByText('2026-09-09 ถึง 2026-09-10');
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกคำขอ' }));

    await waitFor(() => expect(cancelLeaveRequest).toHaveBeenCalledWith(44));
    expect(screen.queryByText('2026-09-09 ถึง 2026-09-10')).toBeNull();
  });
});
