'use server';

import { getDb } from '@/db';
import { user, noteProject, noteCard, redemptionCode, redemptionRecord } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import { sql, eq, gte, and } from 'drizzle-orm';

/**
 * 获取管理员仪表板统计数据
 */
export const getAdminStatsAction = adminActionClient
  .action(async () => {
    try {
      const db = await getDb();

      // 获取各种统计数据
      const [
        totalUsersResult,
        totalProjectsResult,
        publicProjectsResult,
        totalCardsResult,
        totalCodesResult,
        usedCodesResult,
        todayUsersResult,
        todayProjectsResult,
      ] = await Promise.all([
        // 总用户数
        db.select({ count: sql<number>`count(*)` }).from(user),
        // 总项目数
        db.select({ count: sql<number>`count(*)` }).from(noteProject),
        // 公开项目数
        db.select({ count: sql<number>`count(*)` })
          .from(noteProject)
          .where(eq(noteProject.isPublic, true)),
        // 总卡片数
        db.select({ count: sql<number>`count(*)` }).from(noteCard),
        // 总兑换码数
        db.select({ count: sql<number>`count(*)` }).from(redemptionCode),
        // 已使用兑换码数
        db.select({ count: sql<number>`count(*)` })
          .from(redemptionCode)
          .where(sql`${redemptionCode.usedCount} > 0`),
        // 今日新用户
        db.select({ count: sql<number>`count(*)` })
          .from(user)
          .where(gte(user.createdAt, sql`CURRENT_DATE`)),
        // 今日新项目
        db.select({ count: sql<number>`count(*)` })
          .from(noteProject)
          .where(gte(noteProject.createdAt, sql`CURRENT_DATE`)),
      ]);

      // 获取最近 7 天的项目统计
      const recentProjectsStats = await db
        .select({
          date: sql<string>`DATE(${noteProject.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(noteProject)
        .where(gte(noteProject.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`))
        .groupBy(sql`DATE(${noteProject.createdAt})`)
        .orderBy(sql`DATE(${noteProject.createdAt})`);

      // 获取风格分布
      const styleDistribution = await db
        .select({
          style: noteProject.visualStyle,
          count: sql<number>`count(*)`,
        })
        .from(noteProject)
        .groupBy(noteProject.visualStyle);

      return {
        success: true,
        stats: {
          totalUsers: Number(totalUsersResult[0]?.count || 0),
          totalProjects: Number(totalProjectsResult[0]?.count || 0),
          publicProjects: Number(publicProjectsResult[0]?.count || 0),
          totalCards: Number(totalCardsResult[0]?.count || 0),
          totalCodes: Number(totalCodesResult[0]?.count || 0),
          usedCodes: Number(usedCodesResult[0]?.count || 0),
          todayUsers: Number(todayUsersResult[0]?.count || 0),
          todayProjects: Number(todayProjectsResult[0]?.count || 0),
        },
        charts: {
          recentProjects: recentProjectsStats,
          styleDistribution,
        },
      };
    } catch (error) {
      console.error('Get admin stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      };
    }
  });

/**
 * 获取待审核的公开项目
 */
export const getPendingReviewProjectsAction = adminActionClient
  .action(async () => {
    try {
      const db = await getDb();

      const projects = await db
        .select({
          id: noteProject.id,
          title: noteProject.title,
          inputText: noteProject.inputText,
          visualStyle: noteProject.visualStyle,
          isPublic: noteProject.isPublic,
          createdAt: noteProject.createdAt,
          userName: user.name,
          userEmail: user.email,
        })
        .from(noteProject)
        .leftJoin(user, eq(noteProject.userId, user.id))
        .where(eq(noteProject.isPublic, true))
        .orderBy(sql`${noteProject.createdAt} DESC`)
        .limit(50);

      // 获取每个项目的第一张图片
      const projectsWithImages = await Promise.all(
        projects.map(async (project) => {
          const cards = await db
            .select({ imageUrl: noteCard.imageUrl })
            .from(noteCard)
            .where(eq(noteCard.projectId, project.id))
            .orderBy(noteCard.order)
            .limit(1);

          return {
            ...project,
            coverImage: cards[0]?.imageUrl || null,
          };
        })
      );

      return {
        success: true,
        projects: projectsWithImages,
      };
    } catch (error) {
      console.error('Get pending review projects error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get projects',
      };
    }
  });

/**
 * 设置项目公开状态（管理员）
 */
export const setProjectPublicStatusAction = adminActionClient
  .schema(require('zod').z.object({
    projectId: require('zod').z.string(),
    isPublic: require('zod').z.boolean(),
  }))
  .action(async ({ parsedInput }) => {
    const { projectId, isPublic } = parsedInput;

    try {
      const db = await getDb();

      await db
        .update(noteProject)
        .set({ isPublic, updatedAt: new Date() })
        .where(eq(noteProject.id, projectId));

      return { success: true };
    } catch (error) {
      console.error('Set project public status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      };
    }
  });
