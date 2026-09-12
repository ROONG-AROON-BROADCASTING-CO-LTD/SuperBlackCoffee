import { secured } from './client';

export type OperationRow = {
  id: number;
  branchCode: string;
  branchName: string;
  [key: string]: unknown;
};
export const listAssets = () => secured<OperationRow[]>('/assets');
export const listMaintenanceTickets = () =>
  secured<OperationRow[]>('/maintenance-tickets');
export const listInspections = () => secured<OperationRow[]>('/inspections');
export const listServiceInvoices = () =>
  secured<OperationRow[]>('/service-invoices');
export const createMaintenanceTicket = (data: {
  branchCode: string;
  title: string;
  description: string;
  priority: string;
  technicianName: string;
  dueAt: string;
  laborCost: number;
  partsCost: number;
  travelCost: number;
}) => secured<{ id: number }>('/maintenance-tickets', { method: 'POST', data });
export const updateMaintenanceStatus = (id: number, status: string) =>
  secured<void>(`/maintenance-tickets/${id}/status`, {
    method: 'PATCH',
    data: { status },
  });
