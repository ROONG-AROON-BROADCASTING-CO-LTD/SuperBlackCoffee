import { secured } from './client';

export type ManagedAttendance = {
  id: number;
  userId: number;
  name: string;
  branchId: number;
  branchName: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
};

export type ManagedLeaveRequest = {
  id: number;
  name: string;
  branchName: string;
  leaveDate: string;
  leaveType: 'sick' | 'personal' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string | null;
  approvedBy?: string;
  decisionNote?: string;
};

export const listManagedAttendance = (month: string) =>
  secured<ManagedAttendance[]>(`/attendance/management?month=${month}`);

export const listManagedLeaveRequests = () =>
  secured<ManagedLeaveRequest[]>('/attendance/leave-requests');

export const updateManagedLeaveRequest = (
  id: number,
  status: 'approved' | 'rejected',
) =>
  secured<{ id: number; status: string }>(`/attendance/leave-requests/${id}`, {
    method: 'PATCH',
    data: { status },
  });
