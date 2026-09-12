import { secured } from './client';

export type BranchSize = 'S' | 'M' | 'L';

export type CompanyBranchInput = {
  name: string;
  code: string;
  size: BranchSize;
};

export type Branch = {
  id: number;
  name: string;
  code: string;
  size?: BranchSize;
  status?: string;
  franchiseeId?: number;
  franchiseeName?: string;
};

export const listBranches = () => secured<Branch[]>('/branches');

export const createCompanyBranch = (data: CompanyBranchInput) =>
  secured<Branch>('/branches', { method: 'POST', data });

export const updateBranchSize = (id: number, size: BranchSize) =>
  secured<{ id: number; size: BranchSize }>(`/branches/${id}/size`, {
    method: 'PATCH',
    data: { size },
  });
