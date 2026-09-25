import { secured } from './client';

export type ExpenseRequestStatus =
  | 'pending'
  | 'approved'
  | 'funded'
  | 'purchasing'
  | 'awaiting_documents'
  | 'completed'
  | 'rejected';

export type ExpenseRequest = {
  id: number;
  title: string;
  category: 'maintenance' | 'office' | 'transport' | 'service' | 'other';
  estimatedAmount: number;
  note: string;
  status: ExpenseRequestStatus;
  createdAt: string;
  requestedByName?: string;
  branch: { id: number; name: string; isFranchise?: boolean };
};

export const listExpenseRequests = () =>
  secured<ExpenseRequest[]>('/expense-requests');

export const updateExpenseRequestStatus = (
  id: number,
  status: Exclude<ExpenseRequestStatus, 'pending'>,
) =>
  secured<{ id: number; status: ExpenseRequestStatus }>(
    `/expense-requests/${id}/status`,
    { method: 'PATCH', data: { status } },
  );
