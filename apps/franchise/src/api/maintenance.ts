import { secured } from '@stackbuild/management';

export type FranchiseMaintenanceTicket = {
  id: number;
  branchCode: string;
  branchName: string;
  title: string;
  priority: 'low' | 'normal' | 'urgent';
  status: 'open' | 'assigned' | 'waiting_parts' | 'completed';
  technicianName: string;
  dueAt: string | null;
  createdAt: string;
};

export type CreateFranchiseMaintenanceTicketInput = {
  title: string;
  description: string;
  priority: FranchiseMaintenanceTicket['priority'];
  dueAt: string;
};

export const listFranchiseMaintenanceTickets = () =>
  secured<FranchiseMaintenanceTicket[]>('/franchise/maintenance-tickets');

export const createFranchiseMaintenanceTicket = (
  input: CreateFranchiseMaintenanceTicketInput,
) =>
  secured<{ id: number; status: 'open' }>('/franchise/maintenance-tickets', {
    method: 'POST',
    data: input,
  });
