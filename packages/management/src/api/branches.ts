import { secured } from './client';

export type ManagedBranch = {
  id: number;
  name: string;
  code: string;
  size?: 'S' | 'M' | 'L';
  status?: string;
  franchiseeId?: number;
};

export const listManagedBranches = () => secured<ManagedBranch[]>('/branches');

// Keep the shared management pages on their existing API name while exposing
// an explicit name to dashboard shells that need a branch directory.
export const listBranches = listManagedBranches;
export type Branch = ManagedBranch;
