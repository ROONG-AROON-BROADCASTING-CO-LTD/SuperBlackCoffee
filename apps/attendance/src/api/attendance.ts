import { publicRequest, secured } from './client';

export type AttendanceSession = {
  accessToken?: string;
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

export const getAttendanceStatus = (token?: string) =>
  secured<AttendanceStatus>(token, '/attendance/today');

export const getAttendanceSummary = (token?: string) =>
  secured<AttendanceSummary>(token, '/attendance/summary');

export const getAttendanceHistory = (token?: string) =>
  secured<AttendanceHistoryItem[]>(token, '/attendance/history');

export const checkIn = (token?: string) =>
  secured<AttendanceStatus>(token, '/attendance/check-in', { method: 'POST' });

export const checkOut = (token?: string) =>
  secured<AttendanceStatus>(token, '/attendance/check-out', {
    method: 'POST',
  });

export const createLeaveRequest = (
  token: string | undefined,
  input: {
    leaveDate: string;
    leaveType: 'sick' | 'personal' | 'other';
    reason: string;
  },
) =>
  secured<{ id: number; status: string }>(token, '/attendance/leave-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
