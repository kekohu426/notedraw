'use server';

import { getDb } from '@/db';
import { user, userCredit, creditTransaction } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { sql, eq, desc, and, gte, lte, like, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// ============================================================
// Schema 定义
// ============================================================

const getCreditsStatsSchema = z.object({});

const getUserCreditsListSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(20),
  search: z.string().optional(),
  sortBy: z.enum(['credits', 'createdAt', 'name']).default('credits'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const getUserCreditDetailsSchema = z.object({
  userId: z.string(),
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

const adjustUserCreditsSchema = z.object({
  userId: z.string(),
  amount: z.number(), // 正数增加，负数减少
  description: z.string().min(1).max(200),
});

const getCreditTransactionsSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(50),
  userId: z.string().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================================
// Actions
// ============================================================

/**
 * 获取积分系统统计数据
 */
export const getCreditsStatsAction = adminActionClient
  .action(async () => {
    try {
      const db = await getDb();

      // 获取各种统计数据
      const [
        totalUsersWithCreditsResult,
        totalCreditsResult,
        todayCreditsAddedResult,
        todayCreditsUsedResult,
        totalTransactionsResult,
      ] = await Promise.all([
        // 有积分记录的用户数
        db.select({ count: sql<number>`count(*)` }).from(userCredit),
        // 系统总积分
        db.select({ sum: sql<number>`COALESCE(sum(${userCredit.currentCredits}), 0)` }).from(userCredit),
        // 今日增加的积分
        db.select({ sum: sql<number>`COALESCE(sum(${creditTransaction.amount}), 0)` })
          .from(creditTransaction)
          .where(and(
            gte(creditTransaction.createdAt, sql`CURRENT_DATE`),
            sql`${creditTransaction.amount} > 0`
          )),
        // 今日消耗的积分
        db.select({ sum: sql<number>`COALESCE(ABS(sum(${creditTransaction.amount})), 0)` })
          .from(creditTransaction)
          .where(and(
            gte(creditTransaction.createdAt, sql`CURRENT_DATE`),
            sql`${creditTransaction.amount} < 0`
          )),
        // 总交易数
        db.select({ count: sql<number>`count(*)` }).from(creditTransaction),
      ]);

      // 获取积分交易类型分布
      const typeDistribution = await db
        .select({
          type: creditTransaction.type,
          count: sql<number>`count(*)`,
          total: sql<number>`sum(${creditTransaction.amount})`,
        })
        .from(creditTransaction)
        .groupBy(creditTransaction.type);

      // 获取最近 7 天的积分变化趋势
      const recentTrend = await db
        .select({
          date: sql<string>`DATE(${creditTransaction.createdAt})`,
          added: sql<number>`COALESCE(sum(CASE WHEN ${creditTransaction.amount} > 0 THEN ${creditTransaction.amount} ELSE 0 END), 0)`,
          used: sql<number>`COALESCE(ABS(sum(CASE WHEN ${creditTransaction.amount} < 0 THEN ${creditTransaction.amount} ELSE 0 END)), 0)`,
        })
        .from(creditTransaction)
        .where(gte(creditTransaction.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`))
        .groupBy(sql`DATE(${creditTransaction.createdAt})`)
        .orderBy(sql`DATE(${creditTransaction.createdAt})`);

      return {
        success: true,
        stats: {
          totalUsersWithCredits: Number(totalUsersWithCreditsResult[0]?.count || 0),
          totalCredits: Number(totalCreditsResult[0]?.sum || 0),
          todayCreditsAdded: Number(todayCreditsAddedResult[0]?.sum || 0),
          todayCreditsUsed: Number(todayCreditsUsedResult[0]?.sum || 0),
          totalTransactions: Number(totalTransactionsResult[0]?.count || 0),
        },
        charts: {
          typeDistribution,
          recentTrend,
        },
      };
    } catch (error) {
      console.error('Get credits stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      };
    }
  });

/**
 * 获取用户积分列表
 */
export const getUserCreditsListAction = adminActionClient
  .schema(getUserCreditsListSchema)
  .action(async ({ parsedInput }) => {
    const { page, pageSize, search, sortBy, sortOrder } = parsedInput;

    try {
      const db = await getDb();

      // 构建查询
      let query = db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          createdAt: user.createdAt,
          credits: sql<number>`COALESCE(${userCredit.currentCredits}, 0)`,
        })
        .from(user)
        .leftJoin(userCredit, eq(user.id, userCredit.userId));

      // 搜索过滤
      if (search) {
        query = query.where(
          or(
            like(user.name, `%${search}%`),
            like(user.email, `%${search}%`)
          )
        ) as typeof query;
      }

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(user);
      const total = Number(countResult[0]?.count || 0);

      // 排序和分页
      const orderColumn = sortBy === 'credits'
        ? sql`COALESCE(${userCredit.currentCredits}, 0)`
        : sortBy === 'name'
          ? user.name
          : user.createdAt;

      const results = await query
        .orderBy(sortOrder === 'desc' ? desc(orderColumn) : orderColumn)
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return {
        success: true,
        users: results,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('Get user credits list error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users',
      };
    }
  });

/**
 * 获取用户积分明细
 */
export const getUserCreditDetailsAction = adminActionClient
  .schema(getUserCreditDetailsSchema)
  .action(async ({ parsedInput }) => {
    const { userId, page, pageSize } = parsedInput;

    try {
      const db = await getDb();

      // 获取用户信息
      const userInfo = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          credits: sql<number>`COALESCE(${userCredit.currentCredits}, 0)`,
        })
        .from(user)
        .leftJoin(userCredit, eq(user.id, userCredit.userId))
        .where(eq(user.id, userId))
        .limit(1);

      if (userInfo.length === 0) {
        return { success: false, error: 'User not found' };
      }

      // 获取交易记录
      const transactions = await db
        .select()
        .from(creditTransaction)
        .where(eq(creditTransaction.userId, userId))
        .orderBy(desc(creditTransaction.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(creditTransaction)
        .where(eq(creditTransaction.userId, userId));
      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        user: userInfo[0],
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('Get user credit details error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get details',
      };
    }
  });

/**
 * 手动调整用户积分
 */
export const adjustUserCreditsAction = adminActionClient
  .schema(adjustUserCreditsSchema)
  .action(async ({ parsedInput }) => {
    const { userId, amount, description } = parsedInput;

    try {
      const db = await getDb();

      // 检查用户是否存在
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (existingUser.length === 0) {
        return { success: false, error: 'User not found' };
      }

      // 获取当前积分
      const currentCredit = await db
        .select()
        .from(userCredit)
        .where(eq(userCredit.userId, userId))
        .limit(1);

      const currentAmount = currentCredit[0]?.currentCredits || 0;
      const newAmount = currentAmount + amount;

      // 不允许负数积分
      if (newAmount < 0) {
        return { success: false, error: '积分不能为负数' };
      }

      // 更新或创建积分记录
      if (currentCredit.length > 0) {
        await db
          .update(userCredit)
          .set({
            currentCredits: newAmount,
            updatedAt: new Date(),
          })
          .where(eq(userCredit.userId, userId));
      } else {
        await db.insert(userCredit).values({
          id: nanoid(),
          userId,
          currentCredits: newAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 记录交易
      await db.insert(creditTransaction).values({
        id: nanoid(),
        userId,
        type: amount > 0 ? 'admin_add' : 'admin_deduct',
        amount,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: `成功${amount > 0 ? '增加' : '扣除'} ${Math.abs(amount)} 积分`,
        newBalance: newAmount,
      };
    } catch (error) {
      console.error('Adjust user credits error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust credits',
      };
    }
  });

/**
 * 获取积分交易记录（全局）
 */
export const getCreditTransactionsAction = adminActionClient
  .schema(getCreditTransactionsSchema)
  .action(async ({ parsedInput }) => {
    const { page, pageSize, userId, type, startDate, endDate } = parsedInput;

    try {
      const db = await getDb();

      // 构建查询条件
      const conditions = [];
      if (userId) {
        conditions.push(eq(creditTransaction.userId, userId));
      }
      if (type) {
        conditions.push(eq(creditTransaction.type, type));
      }
      if (startDate) {
        conditions.push(gte(creditTransaction.createdAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(creditTransaction.createdAt, new Date(endDate)));
      }

      // 获取交易记录
      const transactions = await db
        .select({
          id: creditTransaction.id,
          userId: creditTransaction.userId,
          type: creditTransaction.type,
          amount: creditTransaction.amount,
          description: creditTransaction.description,
          createdAt: creditTransaction.createdAt,
          userName: user.name,
          userEmail: user.email,
        })
        .from(creditTransaction)
        .leftJoin(user, eq(creditTransaction.userId, user.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(creditTransaction.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // 获取总数
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(creditTransaction);

      const countResult = conditions.length > 0
        ? await countQuery.where(and(...conditions))
        : await countQuery;
      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('Get credit transactions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions',
      };
    }
  });
