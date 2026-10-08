import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyLeaveRequests } from './MyLeaveRequests';
import {
  cancelLeaveRequest,
  listMyLeaveRequests,
  type MyLeaveRequest,
} from '../api/attendance';

vi.mock('../api/attendance', () => ({
  cancelLeaveRequest: vi.fn(),
  listMyLeaveRequests: vi.fn(),
  leaveRequestPdfUrl: (id: number) => `/attendance/leave-requests/${id}/pdf`,
}));

const pending: MyLeaveRequest = {
  id: 42,
  leaveDate: '2026-10-08',
  leaveEndDate: '2026-10-09',
  leaveType: 'sick',
  reason: 'พักรักษาตัว',
  contactPhone: '',
  additionalDetails: '',
  attachments: [],
  status: 'pending',
  createdAt: '2026-10-07',
};

describe('MyLeaveRequests cancellation', () => {
  beforeEach(() => {
    vi.mocked(listMyLeaveRequests).mockResolvedValue([pending]);
    vi.mocked(cancelLeaveRequest).mockResolvedValue({ id: pending.id });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('does not delete a pending request when the employee declines confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<MyLeaveRequests />);
    fireEvent.click(await screen.findByRole('button', { name: 'ยกเลิกคำขอ' }));
    expect(cancelLeaveRequest).not.toHaveBeenCalled();
    expect(screen.getByText('2026-10-08 ถึง 2026-10-09')).toBeInTheDocument();
  });

  it('removes only a successfully cancelled request and retains approved documents', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(listMyLeaveRequests).mockResolvedValue([
      pending,
      {
        ...pending,
        id: 43,
        leaveDate: '2026-11-01',
        leaveEndDate: '2026-11-01',
        status: 'approved',
      },
    ]);
    render(<MyLeaveRequests />);
    const cancel = await screen.findByRole('button', { name: 'ยกเลิกคำขอ' });
    expect(screen.getAllByRole('button', { name: 'ยกเลิกคำขอ' })).toHaveLength(
      1,
    );
    fireEvent.click(cancel);
    await waitFor(() =>
      expect(
        screen.queryByText('2026-10-08 ถึง 2026-10-09'),
      ).not.toBeInTheDocument(),
    );
    expect(cancelLeaveRequest).toHaveBeenCalledExactlyOnceWith(42);
    expect(screen.getByText('อนุมัติแล้ว')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ดูใบลา PDF' })).toHaveAttribute(
      'href',
      '/attendance/leave-requests/43/pdf',
    );
  });

  it('keeps the request and enables retry when cancellation fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(cancelLeaveRequest).mockRejectedValueOnce(
      new Error('ไม่สามารถยกเลิกคำขอลาได้'),
    );
    render(<MyLeaveRequests />);
    fireEvent.click(await screen.findByRole('button', { name: 'ยกเลิกคำขอ' }));
    expect(
      await screen.findByText('ไม่สามารถยกเลิกคำขอลาได้'),
    ).toBeInTheDocument();
    expect(screen.getByText('2026-10-08 ถึง 2026-10-09')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิกคำขอ' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกคำขอ' }));
    await waitFor(() =>
      expect(screen.getByText('ยังไม่มีคำขอลา')).toBeInTheDocument(),
    );
    expect(cancelLeaveRequest).toHaveBeenCalledTimes(2);
  });
});
