'use server';

import { getDb } from '@/db';
import { redemptionCode, redemptionRecord, userCredit, creditTransaction } from '@/db/schema';
import { userActionClient, adminActionClient } from '@/lib/safe-action';
import type { User } from '@/lib/auth-types';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, desc, and, gt, sql } from 'drizzle-orm';
import { CREDIT_TRANSACTION_TYPE } from '@/credits/types';

// ============================================================
// Schema 定义
// ============================================================

const redeemCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

const createCodeSchema = z.object({
  type: z.enum(['credits', 'membership', 'trial']),
  value: z.number().min(1),
  description: z.string().optional(),
  maxUses: z.number().min(1).default(1),
  expiresAt: z.string().optional(), // ISO date string
  count: z.number().min(1).max(100).default(1), // 批量生成数量
});

const updateCodeSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  maxUses: z.number().min(1).optional(),
  expiresAt: z.string().optional(),
});

// ============================================================
// 用户兑换
// ============================================================

/**
 * 用户兑换码
 */
export const redeemCodeAction = userActionClient
  .schema(redeemCodeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { code } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();
      const normalizedCode = code.trim().toUpperCase();

      // 查找兑换码
      const codes = await db
        .select()
        .from(redemptionCode)
        .where(eq(redemptionCode.code, normalizedCode))
        .limit(1);

      if (codes.length === 0) {
        return { success: false, error: '兑换码不存在' };
      }

      const codeRecord = codes[0];

      // 验证兑换码状态
      if (!codeRecord.isActive) {
        return { success: false, error: '兑换码已失效' };
      }

      if (codeRecord.usedCount >= codeRecord.maxUses) {
        return { success: false, error: '兑换码已达到使用上限' };
      }

      if (codeRecord.expiresAt && new Date(codeRecord.expiresAt) < new Date()) {
        return { success: false, error: '兑换码已过期' };
      }

      // 检查用户是否已经兑换过
      const existingRedemption = await db
        .select()
        .from(redemptionRecord)
        .where(
          and(
            eq(redemptionRecord.codeId, codeRecord.id),
            eq(redemptionRecord.userId, currentUser.id)
          )
        )
        .limit(1);

      if (existingRedemption.length > 0) {
        return { success: false, error: '您已经兑换过此兑换码' };
      }

      // 执行兑换
      const redemptionId = nanoid();

      // 根据类型处理
      if (codeRecord.type === 'credits') {
        const now = new Date();

        // 添加积分
        const existingCredit = await db
          .select()
          .from(userCredit)
          .where(eq(userCredit.userId, currentUser.id))
          .limit(1);

        if (existingCredit.length > 0) {
          await db
            .update(userCredit)
            .set({
              currentCredits: sql`${userCredit.currentCredits} + ${codeRecord.value}`,
              updatedAt: now,
            })
            .where(eq(userCredit.userId, currentUser.id));
        } else {
          await db.insert(userCredit).values({
            id: nanoid(),
            userId: currentUser.id,
            currentCredits: codeRecord.value,
          });
        }

        // 添加积分明细记录
        await db.insert(creditTransaction).values({
          id: nanoid(),
          userId: currentUser.id,
          type: CREDIT_TRANSACTION_TYPE.REDEMPTION,
          amount: codeRecord.value,
          remainingAmount: codeRecord.value,
          description: `兑换码兑换: ${codeRecord.code}`,
          createdAt: now,
          updatedAt: now,
        });
      }
      // TODO: 处理 membership 和 trial 类型

      // 记录兑换
      await db.insert(redemptionRecord).values({
        id: redemptionId,
        codeId: codeRecord.id,
        userId: currentUser.id,
        code: codeRecord.code,
        type: codeRecord.type,
        value: codeRecord.value,
      });

      // 更新使用次数
      await db
        .update(redemptionCode)
        .set({
          usedCount: codeRecord.usedCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(redemptionCode.id, codeRecord.id));

      const typeLabels: Record<string, string> = {
        credits: '积分',
        membership: '天会员',
        trial: '天试用',
      };

      return {
        success: true,
        message: `成功兑换 ${codeRecord.value} ${typeLabels[codeRecord.type] || ''}`,
        type: codeRecord.type,
        value: codeRecord.value,
      };
    } catch (error) {
      console.error('Redeem code error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '兑换失败',
      };
    }
  });

/**
 * 获取用户兑换记录
 */
export const getUserRedemptionsAction = userActionClient
  .action(async ({ ctx }) => {
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      const records = await db
        .select()
        .from(redemptionRecord)
        .where(eq(redemptionRecord.userId, currentUser.id))
        .orderBy(desc(redemptionRecord.redeemedAt));

      return {
        success: true,
        records,
      };
    } catch (error) {
      console.error('Get user redemptions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get redemptions',
      };
    }
  });

// ============================================================
// 管理员功能
// ============================================================

/**
 * 生成兑换码（批量）
 */
export const createRedemptionCodesAction = adminActionClient
  .schema(createCodeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { type, value, description, maxUses, expiresAt, count } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();
      const codes: string[] = [];

      for (let i = 0; i < count; i++) {
        const id = nanoid();
        // 生成格式：NOTEDRAW-XXXX-XXXX
        const code = `NOTEDRAW-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;

        await db.insert(redemptionCode).values({
          id,
          code,
          type,
          value,
          description,
          maxUses,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: currentUser.id,
        });

        codes.push(code);
      }

      return {
        success: true,
        codes,
        message: `成功生成 ${count} 个兑换码`,
      };
    } catch (error) {
      console.error('Create redemption codes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create codes',
      };
    }
  });

/**
 * 获取所有兑换码（管理员）
 */
export const getRedemptionCodesAction = adminActionClient
  .action(async () => {
    try {
      const db = await getDb();

      const codes = await db
        .select()
        .from(redemptionCode)
        .orderBy(desc(redemptionCode.createdAt));

      return {
        success: true,
        codes,
      };
    } catch (error) {
      console.error('Get redemption codes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get codes',
      };
    }
  });

/**
 * 更新兑换码状态
 */
export const updateRedemptionCodeAction = adminActionClient
  .schema(updateCodeSchema)
  .action(async ({ parsedInput }) => {
    const { id, isActive, maxUses, expiresAt } = parsedInput;

    try {
      const db = await getDb();

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (isActive !== undefined) updateData.isActive = isActive;
      if (maxUses !== undefined) updateData.maxUses = maxUses;
      if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);

      await db
        .update(redemptionCode)
        .set(updateData)
        .where(eq(redemptionCode.id, id));

      return { success: true };
    } catch (error) {
      console.error('Update redemption code error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update code',
      };
    }
  });

/**
 * 获取兑换码使用记录（含用户信息）
 */
export const getCodeRedemptionsAction = adminActionClient
  .schema(z.object({ codeId: z.string() }))
  .action(async ({ parsedInput }) => {
    const { codeId } = parsedInput;

    try {
      const db = await getDb();
      const { user } = await import('@/db/schema');

      const records = await db
        .select({
          id: redemptionRecord.id,
          codeId: redemptionRecord.codeId,
          userId: redemptionRecord.userId,
          code: redemptionRecord.code,
          type: redemptionRecord.type,
          value: redemptionRecord.value,
          redeemedAt: redemptionRecord.redeemedAt,
          userName: user.name,
          userEmail: user.email,
        })
        .from(redemptionRecord)
        .leftJoin(user, eq(redemptionRecord.userId, user.id))
        .where(eq(redemptionRecord.codeId, codeId))
        .orderBy(desc(redemptionRecord.redeemedAt));

      return {
        success: true,
        records,
      };
    } catch (error) {
      console.error('Get code redemptions error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get records',
      };
    }
  });

/**
 * 获取所有兑换记录（管理员全局视图）
 */
export const getAllRedemptionRecordsAction = adminActionClient
  .schema(z.object({
    page: z.number().default(1),
    pageSize: z.number().default(50),
  }))
  .action(async ({ parsedInput }) => {
    const { page, pageSize } = parsedInput;

    try {
      const db = await getDb();
      const { user } = await import('@/db/schema');

      // 获取记录
      const records = await db
        .select({
          id: redemptionRecord.id,
          codeId: redemptionRecord.codeId,
          userId: redemptionRecord.userId,
          code: redemptionRecord.code,
          type: redemptionRecord.type,
          value: redemptionRecord.value,
          redeemedAt: redemptionRecord.redeemedAt,
          userName: user.name,
          userEmail: user.email,
        })
        .from(redemptionRecord)
        .leftJoin(user, eq(redemptionRecord.userId, user.id))
        .orderBy(desc(redemptionRecord.redeemedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(redemptionRecord);
      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('Get all redemption records error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get records',
      };
    }
  });
