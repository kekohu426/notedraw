'use server';

import { getDb } from '@/db';
import { noteProject, noteCard, user } from '@/db/schema';
import { actionClient, userActionClient } from '@/lib/safe-action';
import type { User } from '@/lib/auth-types';
import { z } from 'zod';
import { eq, desc, and, sql } from 'drizzle-orm';

// ============================================================
// Schema 定义
// ============================================================

const getGallerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(12),
  style: z.enum(['all', 'sketch', 'business', 'cute', 'minimal', 'chalkboard']).optional(),
  language: z.enum(['all', 'en', 'zh']).optional(),
});

const togglePublicSchema = z.object({
  projectId: z.string(),
  isPublic: z.boolean(),
  tags: z.string().optional(),
});

const getPublicProjectSchema = z.object({
  projectId: z.string(),
});

// ============================================================
// 公共 Actions (无需登录)
// ============================================================

/**
 * 获取广场公开项目列表
 */
export const getGalleryProjectsAction = actionClient
  .schema(getGallerySchema)
  .action(async ({ parsedInput }) => {
    const { page, limit, style, language } = parsedInput;
    const offset = (page - 1) * limit;

    try {
      const db = await getDb();

      // 构建查询条件
      const conditions = [
        eq(noteProject.isPublic, true),
        eq(noteProject.status, 'completed'),
      ];

      if (style && style !== 'all') {
        conditions.push(eq(noteProject.visualStyle, style));
      }

      if (language && language !== 'all') {
        conditions.push(eq(noteProject.language, language));
      }

      // 查询项目
      const projects = await db
        .select({
          id: noteProject.id,
          title: noteProject.title,
          inputText: noteProject.inputText,
          visualStyle: noteProject.visualStyle,
          language: noteProject.language,
          tags: noteProject.tags,
          likes: noteProject.likes,
          views: noteProject.views,
          createdAt: noteProject.createdAt,
          userName: user.name,
          userImage: user.image,
        })
        .from(noteProject)
        .leftJoin(user, eq(noteProject.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(noteProject.createdAt))
        .limit(limit)
        .offset(offset);

      // 获取每个项目的第一张图片
      const projectsWithImages = await Promise.all(
        projects.map(async (project) => {
          const cards = await db
            .select({
              imageUrl: noteCard.imageUrl,
            })
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

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(noteProject)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        projects: projectsWithImages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get gallery projects error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get projects',
      };
    }
  });

/**
 * 获取单个公开项目详情
 */
export const getPublicProjectAction = actionClient
  .schema(getPublicProjectSchema)
  .action(async ({ parsedInput }) => {
    const { projectId } = parsedInput;

    try {
      const db = await getDb();

      // 获取项目
      const projects = await db
        .select({
          id: noteProject.id,
          title: noteProject.title,
          inputText: noteProject.inputText,
          visualStyle: noteProject.visualStyle,
          language: noteProject.language,
          tags: noteProject.tags,
          likes: noteProject.likes,
          views: noteProject.views,
          isPublic: noteProject.isPublic,
          createdAt: noteProject.createdAt,
          userName: user.name,
          userImage: user.image,
        })
        .from(noteProject)
        .leftJoin(user, eq(noteProject.userId, user.id))
        .where(
          and(
            eq(noteProject.id, projectId),
            eq(noteProject.isPublic, true)
          )
        )
        .limit(1);

      if (projects.length === 0) {
        return { success: false, error: 'Project not found or not public' };
      }

      const project = projects[0];

      // 增加浏览数
      await db
        .update(noteProject)
        .set({ views: sql`${noteProject.views} + 1` })
        .where(eq(noteProject.id, projectId));

      // 获取卡片
      const cards = await db
        .select()
        .from(noteCard)
        .where(eq(noteCard.projectId, projectId))
        .orderBy(noteCard.order);

      return {
        success: true,
        project: {
          ...project,
          cards,
        },
      };
    } catch (error) {
      console.error('Get public project error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project',
      };
    }
  });

// ============================================================
// 用户 Actions (需要登录)
// ============================================================

/**
 * 切换项目公开状态
 */
export const toggleProjectPublicAction = userActionClient
  .schema(togglePublicSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, isPublic, tags } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 验证项目所有权
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.id, projectId))
        .limit(1);

      if (projects.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      if (projects[0].userId !== currentUser.id) {
        return { success: false, error: 'Unauthorized' };
      }

      // 更新公开状态
      await db
        .update(noteProject)
        .set({
          isPublic,
          tags: tags || null,
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return { success: true };
    } catch (error) {
      console.error('Toggle project public error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project',
      };
    }
  });

/**
 * 点赞项目
 */
export const likeProjectAction = userActionClient
  .schema(z.object({ projectId: z.string() }))
  .action(async ({ parsedInput }) => {
    const { projectId } = parsedInput;

    try {
      const db = await getDb();

      await db
        .update(noteProject)
        .set({ likes: sql`${noteProject.likes} + 1` })
        .where(
          and(
            eq(noteProject.id, projectId),
            eq(noteProject.isPublic, true)
          )
        );

      return { success: true };
    } catch (error) {
      console.error('Like project error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like project',
      };
    }
  });
