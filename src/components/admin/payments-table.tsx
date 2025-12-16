'use client';

import { UserDetailViewer } from '@/components/admin/user-detail-viewer';
import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { websiteConfig } from '@/config/website';
import { formatDate } from '@/lib/formatter';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CheckCircleIcon, XCircleIcon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

// Helper to get price display string from config
function getPriceDisplay(priceId: string) {
  // Check subscription plans
  const subscriptionPlan = websiteConfig.pricing.plans.find((p) =>
    p.prices.some((pr) => pr.priceId === priceId || pr.creemPriceId === priceId)
  );
  if (subscriptionPlan) {
    const price = subscriptionPlan.prices.find(
      (pr) => pr.priceId === priceId || pr.creemPriceId === priceId
    );
    if (price) {
      return `${price.currency} ${(price.amount / 100).toFixed(2)} / ${
        price.interval
      }`;
    }
  }

  // Check credit plans
  if (websiteConfig.credits?.plans) {
    const creditPlan = websiteConfig.credits.plans.find(
      (p) => p.priceId === priceId || p.creemPriceId === priceId
    );
    if (creditPlan) {
      return `USD ${(creditPlan.amount / 100).toFixed(2)} (${
        creditPlan.credits
      } Credits)`;
    }
  }

  return priceId || '-';
}

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <TableRow className="h-14">
      {Array.from({ length: columns }).map((_, index) => (
        <TableCell key={index} className="py-3">
          <Skeleton className="h-4 w-20" />
        </TableCell>
      ))}
    </TableRow>
  );
}

interface PaymentsTableProps {
  data: any[];
  total: number;
  pageIndex: number;
  pageSize: number;
  search: string;
  sorting: SortingState;
  filters?: ColumnFiltersState;
  loading?: boolean;
  onSearch: (search: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onFiltersChange?: (filters: ColumnFiltersState) => void;
}

export function PaymentsTable({
  data,
  total,
  pageIndex,
  pageSize,
  search,
  sorting,
  filters,
  loading,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onSortingChange,
  onFiltersChange,
}: PaymentsTableProps) {
  const t = useTranslations('Dashboard.admin.orders');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const statusFilterOptions = useMemo(
    () => [
      { label: t('status.succeeded'), value: 'succeeded' },
      { label: t('status.pending'), value: 'pending' },
      { label: t('status.failed'), value: 'failed' },
    ],
    [t]
  );

  const providerFilterOptions = useMemo(
    () => [
      { label: 'Stripe', value: 'stripe' },
      { label: 'Creem', value: 'creem' },
    ],
    []
  );

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t('columns.id')} />
        ),
        cell: ({ row }) => (
          <div className="font-mono text-xs truncate w-24" title={row.original.id}>
            {row.original.id}
          </div>
        ),
        meta: { label: t('columns.id') },
      },
      {
        id: 'user',
        accessorKey: 'user',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t('columns.user')} />
        ),
        cell: ({ row }) => {
          const user = row.original.user;
          if (!user) return '-';
          return <UserDetailViewer user={user} />;
        },
        meta: { label: t('columns.user') },
      },
      {
        id: 'amount',
        accessorKey: 'priceId',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t('columns.amount')} />
        ),
        cell: ({ row }) => {
          return (
            <div className="font-medium">
              {getPriceDisplay(row.original.priceId)}
            </div>
          );
        },
        meta: { label: t('columns.amount') },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t('columns.status')} />
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={status === 'succeeded' ? 'default' : 'outline'}
              className={
                status === 'succeeded'
                  ? 'bg-green-500 hover:bg-green-600'
                  : status === 'failed'
                  ? 'text-red-500 border-red-500'
                  : ''
              }
            >
              {status === 'succeeded' ? (
                <CheckCircleIcon className="mr-1 h-3 w-3" />
              ) : status === 'failed' ? (
                <XCircleIcon className="mr-1 h-3 w-3" />
              ) : null}
              {t(`status.${status}`) || status}
            </Badge>
          );
        },
        meta: { label: t('columns.status') },
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t('columns.type')} />
        ),
        cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
        meta: { label: t('columns.type') },
      },
      {
        id: 'provider',
        accessorKey: 'provider',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t('columns.provider')} />
        ),
        cell: ({ row }) => (
          <span className="capitalize">{row.original.provider}</span>
        ),
        meta: { label: t('columns.provider') },
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t('columns.createdAt')}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
        meta: { label: t('columns.createdAt') },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: {
      sorting,
      columnFilters: filters ?? [],
      columnVisibility,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange?.(next);
    },
    onColumnFiltersChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(filters ?? []) : updater;
      onFiltersChange?.(next);
      onPageChange(0);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater;
      if (next.pageSize !== pageSize) {
        onPageSizeChange(next.pageSize);
        if (pageIndex !== 0) onPageChange(0);
      } else if (next.pageIndex !== pageIndex) {
        onPageChange(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableMultiSort: false,
  });

  return (
    <div className="w-full space-y-4">
      <div className="">
        <DataTableAdvancedToolbar table={table}>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder={t('search')}
                value={search}
                onChange={(event) => {
                  onSearch(event.target.value);
                  onPageChange(0);
                }}
                className="h-8 w-[260px] pr-8"
              />
              {search.length > 0 ? (
                <button
                  type="button"
                  aria-label={t('clearSearch')}
                  className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    onSearch('');
                    onPageChange(0);
                  }}
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title={t('columns.status')}
              options={statusFilterOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn('provider')}
              title={t('columns.provider')}
              options={providerFilterOptions}
            />
          </div>
        </DataTableAdvancedToolbar>
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={columns.length} />
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="h-14">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {t('noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} className="px-0" />
      </div>
    </div>
  );
}
