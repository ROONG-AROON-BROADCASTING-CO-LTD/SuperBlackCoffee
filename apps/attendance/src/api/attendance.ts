import { API_URL, publicRequest, secured, securedBlob } from './client';
import type { AttendanceLocation } from '../lib/attendanceLocation';

export type AttendanceSession = {
  user: {
    id: number;
    name: string;
    role: string;
    branchId: number;
    branchName: string;
    startsAt: string;
    endsAt: string;
    isHeadquarters?: boolean;
  };
};

export type AttendanceStatus = {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkedIn: boolean;
  shiftStatus: string;
  canRecordAttendance: boolean;
};

export type AttendanceHistoryItem = {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
};

export type AttendanceSummary = {
  month: string;
  sickLeaveCount: number;
  personalLeaveCount: number;
  otherLeaveCount: number;
  lateCount: number;
};

export type AttendancePINChallenge = {
  requiresPIN?: true;
  requiresPINSetup?: true;
  user: { name: string };
};

export type AttendanceLoginResult = AttendanceSession | AttendancePINChallenge;

export const loginAttendance = (username: string, pin = '') =>
  publicRequest<AttendanceLoginResult>('/attendance/login', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });

export const setupAttendancePIN = (username: string, pin: string) =>
  publicRequest<AttendanceSession>('/attendance/setup-pin', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  });

export const restoreAttendanceSession = () =>
  secured<AttendanceSession>('/attendance/session');

export const logoutAttendance = () =>
  publicRequest<void>('/attendance/logout', { method: 'POST' });

export const getAttendanceStatus = () =>
  secured<AttendanceStatus>('/attendance/today');

export const getAttendanceSummary = () =>
  secured<AttendanceSummary>('/attendance/summary');

export const getAttendanceHistory = () =>
  secured<AttendanceHistoryItem[]>('/attendance/history');

export const checkIn = (location: AttendanceLocation) =>
  secured<AttendanceStatus>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(location),
  });

export const checkOut = (location: AttendanceLocation) =>
  secured<AttendanceStatus>('/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify(location),
  });

export const createLeaveRequest = (input: {
  leaveDate: string;
  leaveEndDate: string;
  leaveType: 'sick' | 'personal' | 'vacation' | 'other';
  reason: string;
  contactPhone: string;
  additionalDetails: string;
  attachments?: File[];
}) => {
  if (!input.attachments?.length) {
    return secured<{ id: number; status: string }>(
      '/attendance/leave-requests',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }
  const formData = new FormData();
  formData.set('leaveDate', input.leaveDate);
  formData.set('leaveEndDate', input.leaveEndDate);
  formData.set('leaveType', input.leaveType);
  formData.set('reason', input.reason);
  formData.set('contactPhone', input.contactPhone);
  formData.set('additionalDetails', input.additionalDetails);
  input.attachments.forEach((file) => formData.append('attachments', file));
  return secured<{ id: number; status: string }>('/attendance/leave-requests', {
    method: 'POST',
    body: formData,
  });
};

export type LeaveRequestAttachment = {
  id: number;
  name: string;
  contentType: string;
  sizeBytes: number;
};

export type MyLeaveRequest = {
  id: number;
  leaveDate: string;
  leaveEndDate: string;
  leaveType: 'sick' | 'personal' | 'vacation' | 'other';
  reason: string;
  contactPhone: string;
  additionalDetails: string;
  attachments: LeaveRequestAttachment[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export const listMyLeaveRequests = () =>
  secured<MyLeaveRequest[]>('/attendance/leave-requests/mine');

export const cancelLeaveRequest = (id: number) =>
  secured<{ id: number }>(`/attendance/leave-requests/${id}`, {
    method: 'DELETE',
  });

export const getLeaveRequestPdf = (id: number) =>
  securedBlob(`/attendance/leave-requests/${id}/pdf`);

// A real document URL is preferable to a blob preview: Chrome can render it
// in its native PDF viewer when a staff member opens the link in a new tab.
export const leaveRequestPdfUrl = (id: number) =>
  `${API_URL}/attendance/leave-requests/${id}/pdf`;
