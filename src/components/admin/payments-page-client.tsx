'use client';

import { PaymentsTable } from '@/components/admin/payments-table';
import { getSortingStateParser } from '@/components/data-table/lib/parsers';
import type { ExtendedColumnSort } from '@/components/data-table/types/data-table';
import { usePayments } from '@/hooks/use-payments';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import {
  parseAsIndex,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import { useEffect, useMemo, useRef } from 'react';

export function PaymentsPageClient() {
  const t = useTranslations('Dashboard.admin.orders');

  const sortableColumnIds = useMemo(
    () => ['createdAt', 'status', 'amount', 'provider', 'type'],
    []
  );

  const sortableColumnSet = useMemo(
    () => new Set(sortableColumnIds),
    [sortableColumnIds]
  );

  const defaultSorting = useMemo<ExtendedColumnSort<any>[]>(
    () => [{ id: 'createdAt', desc: true }],
    []
  );

  const [{ page, size, search, sort, status, provider }, setQueryStates] =
    useQueryStates({
      page: parseAsIndex.withDefault(0),
      size: parseAsInteger.withDefault(10),
      search: parseAsString.withDefault(''),
      sort: getSortingStateParser<any>(sortableColumnIds).withDefault(
        defaultSorting
      ),
      status: parseAsString.withDefault(''),
      provider: parseAsString.withDefault(''),
    });

  const normalizeSorting = (value: SortingState): ExtendedColumnSort<any>[] => {
    const filtered = value
      .filter((item) => sortableColumnSet.has(item.id))
      .map((item) => ({
        ...item,
        id: item.id,
      })) as ExtendedColumnSort<any>[];

    return filtered.length > 0 ? filtered : defaultSorting;
  };

  const safeSorting = normalizeSorting(sort);

  const filters = useMemo(() => {
    const clientFilters: ColumnFiltersState = [];
    const serverFilters: Array<{ id: string; value: string }> = [];

    if (status) {
      clientFilters.push({ id: 'status', value: [status] });
      serverFilters.push({ id: 'status', value: status });
    }
    if (provider) {
      clientFilters.push({ id: 'provider', value: [provider] });
      serverFilters.push({ id: 'provider', value: provider });
    }

    return { clientFilters, serverFilters };
  }, [status, provider]);

  const filtersSignature = useMemo(
    () => JSON.stringify({ status, provider }),
    [status, provider]
  );

  const previousFiltersSignatureRef = useRef(filtersSignature);

  useEffect(() => {
    if (previousFiltersSignatureRef.current === filtersSignature) return;
    previousFiltersSignatureRef.current = filtersSignature;
    void setQueryStates(
      { page: 0 },
      {
        history: 'replace',
        shallow: true,
      }
    );
  }, [filtersSignature, setQueryStates]);

  const { data, isLoading } = usePayments(
    page,
    size,
    search,
    safeSorting,
    filters.serverFilters
  );

  return (
    <PaymentsTable
      data={data?.items || []}
      total={data?.total || 0}
      pageIndex={page}
      pageSize={size}
      search={search}
      sorting={safeSorting}
      filters={filters.clientFilters}
      loading={isLoading}
      onSearch={(newSearch) => setQueryStates({ search: newSearch, page: 0 })}
      onPageChange={(newPageIndex) => setQueryStates({ page: newPageIndex })}
      onPageSizeChange={(newPageSize) =>
        setQueryStates({ size: newPageSize, page: 0 })
      }
      onSortingChange={(newSorting) => {
        const nextSorting = normalizeSorting(newSorting);
        setQueryStates({ sort: nextSorting, page: 0 });
      }}
      onFiltersChange={(nextFilters) => {
        const statusFilter = nextFilters.find(
          (filter) => filter.id === 'status'
        );
        const providerFilter = nextFilters.find(
          (filter) => filter.id === 'provider'
        );
        const nextStatus =
          statusFilter && Array.isArray(statusFilter.value)
            ? ((statusFilter.value[0] as string) ?? '')
            : '';
        const nextProvider =
          providerFilter && Array.isArray(providerFilter.value)
            ? ((providerFilter.value[0] as string) ?? '')
            : '';
        setQueryStates(
          { status: nextStatus, provider: nextProvider, page: 0 },
          { history: 'replace', shallow: true }
        );
      }}
    />
  );
}
