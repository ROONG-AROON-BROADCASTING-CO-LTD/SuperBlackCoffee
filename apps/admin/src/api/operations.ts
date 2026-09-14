import { downloadSecuredPDF, secured } from './client';

export type OperationRow = {
  id: number;
  branchCode: string;
  branchName: string;
  [key: string]: unknown;
};
export type InspectionInput = {
  branchCode: string;
  inspectorName: string;
  status: 'passed' | 'needs_action' | 'failed';
  score: number;
  findings: string;
  dueAt: string;
  actionOwner: string;
  checklistResults: string[];
  evidenceURLs: string[];
};
export type AssetInput = {
  branchCode: string;
  name: string;
  assetType: string;
  serialNumber: string;
  warrantyUntil: string;
  maintenanceDue: string;
};
export type InvoiceInput = {
  branchCode: string;
  invoiceNumber: string;
  serviceType: 'inspection' | 'maintenance' | 'parts' | 'subscription';
  amount: number;
  dueAt: string;
  maintenanceTicketId?: number;
  inspectionId?: number;
};
export type AssetEvent = {
  id: number;
  branchCode: string;
  branchName: string;
  eventType: string;
  note: string;
  createdAt: string;
};
export type InspectionTemplate = {
  id: number;
  name: string;
  branchSize: 'all' | 'S' | 'M' | 'L';
  checklist: string[];
};
export type RandomInspection = {
  id: number;
  branchCode: string;
  branchName: string;
  branchSize: string;
  inspectorName: string;
  templateId: number;
  templateName: string;
  checklist: string[];
  dueAt: string;
};
export const listAssets = () => secured<OperationRow[]>('/assets');
export const listMaintenanceTickets = () =>
  secured<OperationRow[]>('/maintenance-tickets');
export const listInspections = () => secured<OperationRow[]>('/inspections');
export const listInspectionTemplates = () =>
  secured<InspectionTemplate[]>('/inspection-templates');
export const createInspectionTemplate = (data: {
  name: string;
  branchSize: InspectionTemplate['branchSize'];
  checklist: string[];
}) =>
  secured<{ id: number }>('/inspection-templates', { method: 'POST', data });
export const randomizeInspection = (data: {
  inspectorName: string;
  branchSize: InspectionTemplate['branchSize'];
  dueAt: string;
  excludeDays: number;
}) =>
  secured<RandomInspection>('/inspections/randomize', { method: 'POST', data });
export const downloadInspectionPDF = (
  id: number,
  branchName?: string,
  branchCode?: string,
) => {
  const clean = (value: string | undefined) =>
    (value ?? '').trim().replace(/[\\/:*?"<>|\s]+/g, '-');
  const branch = [clean(branchName), clean(branchCode)]
    .filter(Boolean)
    .join('_');
  const suffix = branch ? `_สาขา-${branch}` : '';
  return downloadSecuredPDF(
    `/inspections/${id}/pdf`,
    `ใบงานตรวจช่าง_งานที่-${id}${suffix}.pdf`,
  );
};
export const downloadMaintenancePDF = (
  id: number,
  branchName?: string,
  branchCode?: string,
) => {
  const clean = (value: string | undefined) =>
    (value ?? '').trim().replace(/[\\/:*?"<>|\s]+/g, '-');
  const branch = [clean(branchName), clean(branchCode)]
    .filter(Boolean)
    .join('_');
  const suffix = branch ? `_สาขา-${branch}` : '';
  return downloadSecuredPDF(
    `/maintenance-tickets/${id}/pdf`,
    `ใบงานแจ้งซ่อม_งานที่-${id}${suffix}.pdf`,
  );
};
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
export const createInspection = (data: InspectionInput) =>
  secured<{ id: number; maintenanceTicketId?: number }>('/inspections', {
    method: 'POST',
    data,
  });
export const completeInspection = (
  id: number,
  data: Omit<InspectionInput, 'branchCode' | 'inspectorName'>,
) =>
  secured<{ id: number; maintenanceTicketId?: number }>(
    `/inspections/${id}/complete`,
    {
      method: 'PATCH',
      data,
    },
  );
export const createAsset = (data: AssetInput) =>
  secured<{ id: number }>('/assets', { method: 'POST', data });
export const updateAsset = (
  id: number,
  data: {
    branchCode: string;
    status: 'active' | 'repairing' | 'retired';
    note: string;
    eventType?: 'transferred';
  },
) => secured<void>(`/assets/${id}`, { method: 'PATCH', data });
export const listAssetEvents = (id: number) =>
  secured<AssetEvent[]>(`/assets/${id}/events`);
export const createServiceInvoice = (data: InvoiceInput) =>
  secured<{ id: number }>('/service-invoices', { method: 'POST', data });
export const updateServiceInvoiceStatus = (id: number, status: string) =>
  secured<void>(`/service-invoices/${id}/status`, {
    method: 'PATCH',
    data: { status },
  });
