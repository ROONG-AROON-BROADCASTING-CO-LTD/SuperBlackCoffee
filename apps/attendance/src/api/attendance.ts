import { publicRequest, secured } from './client';

export type AttendanceSession = {
  user: {
    id: number;
    name: string;
    role: string;
    branchId: number;
    branchName: string;
    startsAt: string;
    endsAt: string;
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

export const checkIn = () =>
  secured<AttendanceStatus>('/attendance/check-in', { method: 'POST' });

export const checkOut = () =>
  secured<AttendanceStatus>('/attendance/check-out', {
    method: 'POST',
  });

export const createLeaveRequest = (input: {
  leaveDate: string;
  leaveType: 'sick' | 'personal' | 'other';
  reason: string;
}) =>
  secured<{ id: number; status: string }>('/attendance/leave-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
