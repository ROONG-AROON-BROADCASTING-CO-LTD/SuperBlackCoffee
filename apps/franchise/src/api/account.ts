import { secured } from '@stackbuild/management';

export type FranchiseAccountSettings = {
  accountName: string;
  username: string;
  email: string;
  franchiseName: string;
  branchName: string;
  branchCode: string;
  plan: 'S' | 'M' | 'L';
};

export const getFranchiseAccountSettings = () =>
  secured<FranchiseAccountSettings>('/franchise/account-settings');

export const updateFranchiseAccountPassword = (input: {
  currentPassword: string;
  newPassword: string;
}) =>
  secured<{ id: number }>('/franchise/account-settings/password', {
    method: 'PATCH',
    data: input,
  });
