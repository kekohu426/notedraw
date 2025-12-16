'use server';

import { getDb } from '@/db';
import { payment, user } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import {
  and,
  asc,
  count as countFn,
  desc,
  eq,
  ilike,
  or,
  sql,
} from 'drizzle-orm';
import { z } from 'zod';

const getPaymentsSchema = z.object({
  pageIndex: z.number().min(0).default(0),
  pageSize: z.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  sorting: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      })
    )
    .optional()
    .default([]),
  filters: z
    .array(
      z.object({
        id: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .default([]),
});

// Define sort field mapping
const sortFieldMap = {
  createdAt: payment.createdAt,
  status: payment.status,
  amount: payment.priceId, // approximate sorting by priceId
  provider: payment.provider,
  type: payment.type,
} as const;

export const getPaymentsAction = adminActionClient
  .schema(getPaymentsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { pageIndex, pageSize, search, sorting, filters } = parsedInput;
      const offset = pageIndex * pageSize;

      const conditions = [];

      // Search by payment ID, customer ID, or user email
      if (search) {
        conditions.push(
          or(
            ilike(payment.id, `%${search}%`),
            ilike(payment.customerId, `%${search}%`),
            ilike(payment.invoiceId, `%${search}%`),
            ilike(user.email, `%${search}%`)
          )
        );
      }

      // Filter conditions
      for (const filter of filters) {
        if (filter.id === 'status' && filter.value) {
          conditions.push(eq(payment.status, filter.value));
        } else if (filter.id === 'provider' && filter.value) {
          conditions.push(eq(payment.provider, filter.value));
        } else if (filter.id === 'type' && filter.value) {
          conditions.push(eq(payment.type, filter.value));
        }
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Sort configuration
      const sortConfig = sorting[0];
      const sortField = sortConfig?.id
        ? sortFieldMap[sortConfig.id as keyof typeof sortFieldMap]
        : payment.createdAt;
      const sortDirection = sortConfig?.desc ? desc : asc;

      const db = await getDb();

      // Query payments with user details
      const [items, [{ count }]] = await Promise.all([
        db
          .select({
            id: payment.id,
            priceId: payment.priceId,
            type: payment.type,
            status: payment.status,
            paid: payment.paid,
            amount: sql<number>`0`, // Placeholder as we don't store amount
            currency: sql<string>`'USD'`, // Placeholder
            provider: payment.provider,
            createdAt: payment.createdAt,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            },
          })
          .from(payment)
          .leftJoin(user, eq(payment.userId, user.id))
          .where(where)
          .orderBy(sortDirection(sortField || payment.createdAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: countFn() })
          .from(payment)
          .leftJoin(user, eq(payment.userId, user.id))
          .where(where),
      ]);

      return {
        success: true,
        data: {
          items,
          total: Number(count),
        },
      };
    } catch (error) {
      console.error('get payments error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payments',
      };
    }
  });
