import { secured } from './client';

export type AuditEvent = {
  id: number;
  branchId: number | null;
  branchName: string;
  actorId: number | null;
  actorName: string;
  entityType: string;
  entityId: number | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};
export const listAuditEvents = () =>
  secured<AuditEvent[]>('/audit-events?limit=100');
