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
export type DashboardTrendPoint = {
  label: string;
  quantity: number;
};
export type SalesTrendPoint = {
  label: string;
  sales: number;
};
export type TopSellingMenu = {
  id: number;
  name: string;
  quantity: number;
  sales: number;
};
export const getDashboardSummary = (branchCode?: string) =>
  secured<DashboardSummary>(
    `/dashboard${branchCode ? `?branchCode=${encodeURIComponent(branchCode)}` : ''}`,
  );
export const listBranchSales = (period: 'today' | 'month' | 'year') =>
  secured<BranchSales[]>(`/branches/sales?period=${period}`);
export const getDashboardTrend = (
  period: 'day' | 'month' | 'year',
  branchCode?: string,
) =>
  secured<DashboardTrendPoint[]>(
    `/dashboard/trend?period=${period}${branchCode ? `&branchCode=${encodeURIComponent(branchCode)}` : ''}`,
  );
export const getSalesTrend = (period: 'day' | 'month' | 'year') =>
  secured<SalesTrendPoint[]>(`/dashboard/sales-trend?period=${period}`);
export const getTopSellingMenus = (branchCode?: string) =>
  secured<TopSellingMenu[]>(
    `/dashboard/top-menus?period=today${branchCode ? `&branchCode=${encodeURIComponent(branchCode)}` : ''}`,
  );
