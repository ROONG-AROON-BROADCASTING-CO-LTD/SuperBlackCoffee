import { secured } from './client';

export type BranchSize = 'S' | 'M' | 'L';

export type CompanyBranchInput = {
  name: string;
  code: string;
  size: BranchSize;
  address?: string;
  opensAt?: string;
  closesAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  attendanceRadiusM?: number;
};

export type Branch = {
  id: number;
  name: string;
  code: string;
  size?: BranchSize;
  status?: string;
  franchiseeId?: number;
  franchiseeName?: string;
  address?: string;
  opensAt?: string;
  closesAt?: string;
  latitude?: number;
  longitude?: number;
  attendanceRadiusM?: number;
};

export const listBranches = () => secured<Branch[]>('/branches');

export const createCompanyBranch = (data: CompanyBranchInput) =>
  secured<Branch>('/branches', { method: 'POST', data });

export const updateCompanyBranchDetails = (
  id: number,
  data: CompanyBranchInput,
) =>
  secured<{ id: number }>(`/branches/${id}/details`, { method: 'PATCH', data });

export const updateBranchSize = (id: number, size: BranchSize) =>
  secured<{ id: number; size: BranchSize }>(`/branches/${id}/size`, {
    method: 'PATCH',
    data: { size },
  });
