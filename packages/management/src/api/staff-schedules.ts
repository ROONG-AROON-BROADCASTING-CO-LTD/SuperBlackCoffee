import { secured, securedBlob } from './client';

export type StaffShift = {
  id: number;
  userId: number;
  name: string;
  branchId?: number;
  date: string;
  startsAt: string;
  endsAt: string;
  status:
    | 'scheduled'
    | 'compensatory_work'
    | 'day_off'
    | 'leave'
    | 'sick_leave'
    | 'personal_leave';
  leaveType?: string;
};

export const listStaffSchedules = (month: string) =>
  secured<StaffShift[]>(`/staff-schedules?month=${month}`);
export const generateStaffSchedules = (month: string, branchId: number) =>
  secured<{ created: number; month: string }>('/staff-schedules/generate', {
    method: 'POST',
    data: { month, branchId },
  });
export const exportStaffSchedulesXlsx = (month: string, branchId: number) =>
  securedBlob(`/staff-schedules/export?month=${month}&branchId=${branchId}`);
export const updateStaffShift = (
  id: number,
  data: {
    shiftDate?: string;
    branchId?: number;
    status?: StaffShift['status'];
    leaveType?: string;
  },
) =>
  secured<{ id: string }>(`/staff-schedules/${id}`, { method: 'PATCH', data });
export const replaceStaffShift = (id: number, sourceShiftId: number) =>
  secured<{ id: string }>(`/staff-schedules/${id}/replace`, {
    method: 'POST',
    data: { sourceShiftId },
  });
