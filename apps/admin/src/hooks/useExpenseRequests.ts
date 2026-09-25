import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listExpenseRequests,
  updateExpenseRequestStatus,
  type ExpenseRequest,
  type ExpenseRequestStatus,
} from '../api/expense-requests';

const expenseRequestsKey = ['expense-requests'] as const;

export const useExpenseRequests = () =>
  useQuery({ queryKey: expenseRequestsKey, queryFn: listExpenseRequests });

export function useUpdateExpenseRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: Exclude<ExpenseRequestStatus, 'pending'>;
    }) => updateExpenseRequestStatus(id, status),
    onSuccess: (_, { id, status }) => {
      queryClient.setQueryData<ExpenseRequest[]>(
        expenseRequestsKey,
        (current) =>
          current?.map((request) =>
            request.id === id ? { ...request, status } : request,
          ),
      );
      void queryClient.invalidateQueries({ queryKey: ['audit-events'] });
    },
  });
}
