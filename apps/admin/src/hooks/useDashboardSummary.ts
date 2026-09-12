import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api';

export const useDashboardSummary = (branchCode?: string) =>
  useQuery({
    queryKey: ['dashboard-summary', branchCode],
    queryFn: () => getDashboardSummary(branchCode),
  });
