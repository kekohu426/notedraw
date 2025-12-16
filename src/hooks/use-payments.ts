import { getPaymentsAction } from '@/actions/get-payments';
import type { ExtendedColumnSort } from '@/components/data-table/types/data-table';
import { useQuery } from '@tanstack/react-query';

export function usePayments(
  pageIndex: number,
  pageSize: number,
  search: string,
  sorting: ExtendedColumnSort<any>[],
  filters: { id: string; value: string }[]
) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payments', pageIndex, pageSize, search, sorting, filters],
    queryFn: async () => {
      const result = await getPaymentsAction({
        pageIndex,
        pageSize,
        search,
        sorting: sorting.map((s) => ({ id: s.id, desc: s.desc })),
        filters,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Failed to fetch payments');
      }

      return result.data.data;
    },
  });

  return {
    data,
    isLoading,
    error,
  };
}
