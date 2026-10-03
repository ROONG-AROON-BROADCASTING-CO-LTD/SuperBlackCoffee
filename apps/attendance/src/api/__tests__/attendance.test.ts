import { afterEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  secured: vi.fn(),
  publicRequest: vi.fn(),
  securedBlob: vi.fn(),
  API_URL: 'https://api.example.test',
}));
vi.mock('../client', () => boundary);
import {
  checkIn,
  checkOut,
  createLeaveRequest,
  cancelLeaveRequest,
} from '../attendance';

describe('attendance mutation contracts', () => {
  afterEach(() => vi.resetAllMocks());
  const input = {
    leaveDate: '2026-12-31',
    leaveEndDate: '2027-01-01',
    leaveType: 'sick' as const,
    reason: 'ป่วย',
    contactPhone: '0810000000',
    additionalDetails: 'พักรักษา',
  };

  it('preserves a leave range across the year boundary in JSON', async () => {
    boundary.secured.mockResolvedValue({ id: 5, status: 'pending' });
    await expect(createLeaveRequest(input)).resolves.toEqual({
      id: 5,
      status: 'pending',
    });
    expect(boundary.secured).toHaveBeenCalledWith(
      '/attendance/leave-requests',
      { method: 'POST', body: JSON.stringify(input) },
    );
  });

  it('includes all leave fields and attachments in multipart without a JSON content type', async () => {
    const files = [
      new File(['first'], 'first.pdf'),
      new File(['second'], 'second.png'),
    ];
    await createLeaveRequest({ ...input, attachments: files });
    const [path, options] = boundary.secured.mock.calls[0];
    expect(path).toBe('/attendance/leave-requests');
    expect(options.method).toBe('POST');
    expect(options.headers).toBeUndefined();
    const body = options.body as FormData;
    for (const [key, value] of Object.entries(input))
      expect(body.get(key)).toBe(value);
    expect(body.getAll('attachments')).toEqual(files);
  });

  it.each([checkIn, checkOut])(
    'propagates location and server rejection without reporting success',
    async (record) => {
      const location = { latitude: 13.7, longitude: 100.5, accuracyM: 15 };
      boundary.secured.mockRejectedValue(new Error('Forbidden'));
      await expect(record(location)).rejects.toThrow('Forbidden');
      expect(boundary.secured).toHaveBeenCalledWith(
        record === checkIn ? '/attendance/check-in' : '/attendance/check-out',
        { method: 'POST', body: JSON.stringify(location) },
      );
    },
  );

  it('propagates refusal to cancel an approved request', async () => {
    boundary.secured.mockRejectedValue(new Error('Conflict'));
    await expect(cancelLeaveRequest(9)).rejects.toThrow('Conflict');
    expect(boundary.secured).toHaveBeenCalledWith(
      '/attendance/leave-requests/9',
      { method: 'DELETE' },
    );
  });
});
