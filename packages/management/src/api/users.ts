import { secured } from './client';

export type Employee = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'franchise_owner' | 'branch_manager' | 'cashier';
  franchiseeId?: number;
  branchId?: number;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  defaultSecondStartsAt?: string;
  defaultSecondEndsAt?: string;
  defaultSecondShiftDays?: number[];
};

export const listEmployees = () => secured<Employee[]>('/users');
export const createEmployee = (data: {
  name: string;
  username: string;
  password: string;
  role: 'branch_manager' | 'cashier';
  branchId: number;
  defaultStartsAt: string;
  defaultEndsAt: string;
  defaultSecondStartsAt?: string;
  defaultSecondEndsAt?: string;
  defaultSecondShiftDays?: number[];
}) => secured<{ id: number }>('/users', { method: 'POST', data });
export const updateEmployee = (
  id: number,
  data: {
    name: string;
    role: 'branch_manager' | 'cashier';
    branchId: number;
    defaultStartsAt: string;
    defaultEndsAt: string;
    defaultSecondStartsAt?: string;
    defaultSecondEndsAt?: string;
    defaultSecondShiftDays?: number[];
  },
) => secured<{ id: number }>(`/users/${id}`, { method: 'PATCH', data });
export const deleteEmployee = (id: number) =>
  secured<void>(`/users/${id}`, { method: 'DELETE' });
