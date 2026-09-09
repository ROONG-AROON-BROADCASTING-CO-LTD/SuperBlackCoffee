import { secured, securedBlob } from './client';

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
  employeeCode?: string;
  position?: string;
  branchName: string;
  leaveDate: string;
  leaveEndDate?: string;
  leaveType: 'sick' | 'personal' | 'vacation' | 'other';
  reason: string;
  contactPhone?: string;
  additionalDetails?: string;
  attachments?: Array<{
    id: number;
    name: string;
    contentType: string;
    sizeBytes: number;
  }>;
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

export const getManagedLeaveRequestAttachment = (
  leaveRequestID: number,
  attachmentID: number,
) =>
  securedBlob(
    `/attendance/leave-requests/${leaveRequestID}/attachments/${attachmentID}/content`,
  );

export const getManagedLeaveRequestPdf = (leaveRequestID: number) =>
  securedBlob(`/attendance/leave-requests/${leaveRequestID}/manager-pdf`);

export const updateManagedLeaveRequest = (
  id: number,
  status: 'approved' | 'rejected',
) =>
  secured<{ id: number; status: string }>(`/attendance/leave-requests/${id}`, {
    method: 'PATCH',
    data: { status },
  });
