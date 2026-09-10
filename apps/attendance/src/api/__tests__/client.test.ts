import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicRequest, secured } from '../client';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveRequestPdf,
  loginAttendance,
} from '../attendance';

describe('attendance API client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends browser credentials so the HttpOnly attendance session cookie is included', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
      }),
    );
    await publicRequest<{ ok: boolean }>('/attendance/login', {
      method: 'POST',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/attendance/login'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('accepts a cookie-backed login response without exposing an access token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: 1,
              name: 'พนักงาน',
              role: 'cashier',
              branchId: 1,
              branchName: 'อยุธยา',
              startsAt: '08:00',
              endsAt: '17:00',
            },
          },
        }),
        { status: 200 },
      ),
    );
    await expect(loginAttendance('staff', '123456')).resolves.toMatchObject({
      user: { name: 'พนักงาน' },
    });
  });

  it('does not attach a JavaScript-readable Bearer token to protected requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
      }),
    );

    await secured<{ ok: boolean }>('/attendance/today');

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.credentials).toBe('include');
    expect(new Headers(options?.headers).get('Authorization')).toBeNull();
  });

  it('preserves an authenticated 401 response so the app can end an expired session', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, message: 'เซสชันหมดอายุ' }),
        { status: 401 },
      ),
    );

    await expect(secured('/attendance/today')).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'เซสชันหมดอายุ',
      status: 401,
    });
  });

  it('does not expose browser network errors to staff', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));

    await expect(secured('/attendance/today')).rejects.toThrow(
      'ไม่สามารถเชื่อมต่อระบบได้',
    );
  });

  it('sends a leave request without attachments as JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { id: 12, status: 'pending' } }),
        {
          status: 200,
        },
      ),
    );

    await createLeaveRequest({
      leaveDate: '2026-12-31',
      leaveEndDate: '2027-01-01',
      leaveType: 'personal',
      reason: 'ธุระส่วนตัว',
      contactPhone: '0800000000',
      additionalDetails: '',
      attachments: [],
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(options).toMatchObject({ method: 'POST' });
    expect(new Headers(options?.headers).get('Content-Type')).toBe(
      'application/json',
    );
    expect(JSON.parse(String(options?.body))).toMatchObject({
      leaveDate: '2026-12-31',
      leaveEndDate: '2027-01-01',
      leaveType: 'personal',
    });
  });

  it('uses multipart form data for leave attachments without forcing a content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { id: 13, status: 'pending' } }),
        {
          status: 200,
        },
      ),
    );
    const attachment = new File(['evidence'], 'medical-note.pdf', {
      type: 'application/pdf',
    });

    await createLeaveRequest({
      leaveDate: '2026-09-09',
      leaveEndDate: '2026-09-10',
      leaveType: 'sick',
      reason: 'ป่วย',
      contactPhone: '',
      additionalDetails: 'ใบรับรองแพทย์',
      attachments: [attachment],
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.body).toBeInstanceOf(FormData);
    const body = options?.body as FormData;
    expect(body.get('leaveType')).toBe('sick');
    expect(body.get('attachments')).toBe(attachment);
    expect(new Headers(options?.headers).get('Content-Type')).toBeNull();
  });

  it('uses the scoped DELETE endpoint when a staff member cancels a leave request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 24 } }), {
        status: 200,
      }),
    );

    await cancelLeaveRequest(24);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/attendance/leave-requests/24'),
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });

  it('returns the generated leave PDF as a Blob', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('pdf-content', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );

    await expect(getLeaveRequestPdf(24)).resolves.toBeInstanceOf(Blob);
  });
});
