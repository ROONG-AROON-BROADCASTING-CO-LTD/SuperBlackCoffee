import { secured } from './client';

export type DashboardSummary = {
  todaySales: number;
  todayOrders: number;
  todayMenuStockCuts: number;
  todayStockEntries: number;
};
export type BranchSales = {
  id: number;
  name: string;
  code: string;
  size: 'S' | 'M' | 'L';
  status: 'active' | 'inactive' | 'maintenance';
  sales: number;
  orders: number;
};
export const getDashboardSummary = (branchCode?: string) =>
  secured<DashboardSummary>(
    `/dashboard${branchCode ? `?branchCode=${encodeURIComponent(branchCode)}` : ''}`,
  );
export const listBranchSales = (period: 'today' | 'month' | 'year') =>
  secured<BranchSales[]>(`/branches/sales?period=${period}`);
