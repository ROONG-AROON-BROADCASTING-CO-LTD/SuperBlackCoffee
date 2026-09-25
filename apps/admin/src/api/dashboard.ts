import { secured } from './client';

export type DashboardSummary = {
  todaySales: number;
  todayOrders: number;
  weekSales: number;
  monthSales: number;
  yearSales: number;
  todayMenuStockCuts: number;
  todayStockEntries: number;
};
export type DashboardScope = 'sbc' | 'franchise';
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
export const getDashboardSummary = (
  branchCode?: string,
  scope?: DashboardScope,
) => {
  const query = new URLSearchParams({
    ...(branchCode ? { branchCode } : {}),
    ...(scope ? { scope } : {}),
  }).toString();
  return secured<DashboardSummary>(`/dashboard${query ? `?${query}` : ''}`);
};
export const listBranchSales = (period: 'today' | 'month' | 'year') =>
  secured<BranchSales[]>(`/branches/sales?period=${period}`);
export const getDashboardTrend = (
  period: 'day' | 'month' | 'year',
  branchCode?: string,
  scope?: DashboardScope,
) =>
  secured<DashboardTrendPoint[]>(
    `/dashboard/trend?${new URLSearchParams({
      period,
      ...(branchCode ? { branchCode } : {}),
      ...(scope ? { scope } : {}),
    }).toString()}`,
  );
export const getSalesTrend = (
  period: 'day' | 'month' | 'year',
  scope?: DashboardScope,
) =>
  secured<SalesTrendPoint[]>(
    `/dashboard/sales-trend?${new URLSearchParams({
      period,
      ...(scope ? { scope } : {}),
    }).toString()}`,
  );
export const getTopSellingMenus = (
  branchCode?: string,
  scope?: DashboardScope,
) =>
  secured<TopSellingMenu[]>(
    `/dashboard/top-menus?${new URLSearchParams({
      period: 'today',
      ...(branchCode ? { branchCode } : {}),
      ...(scope ? { scope } : {}),
    }).toString()}`,
  );
