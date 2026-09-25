import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, type DashboardScope } from '../api';

export const useDashboardSummary = (
  branchCode?: string,
  scope?: DashboardScope,
) =>
  useQuery({
    queryKey: ['dashboard-summary', branchCode, scope],
    queryFn: () => getDashboardSummary(branchCode, scope),
  });
