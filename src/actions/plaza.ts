'use server';

import { getDb } from '@/db';
import { noteProject, noteCard, user } from '@/db/schema';
import { userActionClient, publicActionClient, adminActionClient } from '@/lib/safe-action';
import type { User } from '@/lib/auth-types';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, desc, and, sql, isNotNull } from 'drizzle-orm';

// ============================================================
// Schema 定义
// ============================================================

const shareToPlazaSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tags: z.string().max(200).optional(), // 逗号分隔的标签
});

const getPlazaNotesSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  tag: z.string().optional(),
  style: z.string().optional(),
});

const getNoteBySlugSchema = z.object({
  slug: z.string(),
});

const removeFromPlazaSchema = z.object({
  projectId: z.string(),
});

// ============================================================
// 辅助函数
// ============================================================

/**
 * 生成 SEO 友好的 slug
 */
function generateSlug(title: string): string {
  // 简单的 slug 生成：使用 nanoid 确保唯一性
  const shortId = nanoid(8);
  // 清理标题作为前缀
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // 保留中英文和数字
    .replace(/^-+|-+$/g, '') // 移除首尾的横线
    .slice(0, 30); // 限制长度

  return cleanTitle ? `${cleanTitle}-${shortId}` : shortId;
}

// ============================================================
// 公共 Actions（无需登录）
// ============================================================

/**
 * 获取广场笔记列表
 */
export const getPlazaNotesAction = publicActionClient
  .schema(getPlazaNotesSchema)
  .action(async ({ parsedInput }) => {
    const { page, limit, tag, style } = parsedInput;
    const offset = (page - 1) * limit;

    try {
      const db = await getDb();

      // 构建查询条件
      const conditions = [
        eq(noteProject.isPublic, true),
        eq(noteProject.status, 'completed'),
      ];

      if (style) {
        conditions.push(eq(noteProject.visualStyle, style));
      }

      // 查询笔记
      const notes = await db
        .select({
          id: noteProject.id,
          title: noteProject.title,
          description: noteProject.description,
          slug: noteProject.slug,
          visualStyle: noteProject.visualStyle,
          tags: noteProject.tags,
          views: noteProject.views,
          likes: noteProject.likes,
          isFeatured: noteProject.isFeatured,
          publishedAt: noteProject.publishedAt,
          createdAt: noteProject.createdAt,
        })
        .from(noteProject)
        .where(and(...conditions))
        .orderBy(
          desc(noteProject.isFeatured),
          desc(noteProject.publishedAt),
          desc(noteProject.createdAt)
        )
        .limit(limit)
        .offset(offset);

      // 批量获取所有笔记的第一张卡片作为封面（解决N+1查询问题）
      const projectIds = notes.map(n => n.id);
      const coverCards = projectIds.length > 0
        ? await db
            .select({
              projectId: noteCard.projectId,
              imageUrl: noteCard.imageUrl,
              order: noteCard.order,
            })
            .from(noteCard)
            .where(
              and(
                sql`${noteCard.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`,
                eq(noteCard.status, 'completed')
              )
            )
            .orderBy(noteCard.projectId, noteCard.order)
        : [];

      // 为每个项目取第一张卡片
      const coverMap = new Map<string, string>();
      for (const card of coverCards) {
        if (!coverMap.has(card.projectId)) {
          coverMap.set(card.projectId, card.imageUrl || '');
        }
      }

      const notesWithCovers = notes.map(note => ({
        ...note,
        coverImage: coverMap.get(note.id) || null,
        tagsArray: note.tags ? note.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }));

      // 如果需要按标签过滤
      let filteredNotes = notesWithCovers;
      if (tag) {
        filteredNotes = notesWithCovers.filter(note =>
          note.tagsArray.includes(tag)
        );
      }

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(noteProject)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        notes: filteredNotes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get plaza notes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notes',
      };
    }
  });

/**
 * 根据 slug 获取笔记详情
 */
export const getNoteBySlugAction = publicActionClient
  .schema(getNoteBySlugSchema)
  .action(async ({ parsedInput }) => {
    const { slug } = parsedInput;

    try {
      const db = await getDb();

      // 获取笔记
      const notes = await db
        .select({
          id: noteProject.id,
          title: noteProject.title,
          description: noteProject.description,
          slug: noteProject.slug,
          inputText: noteProject.inputText,
          visualStyle: noteProject.visualStyle,
          language: noteProject.language,
          tags: noteProject.tags,
          views: noteProject.views,
          likes: noteProject.likes,
          isFeatured: noteProject.isFeatured,
          publishedAt: noteProject.publishedAt,
          createdAt: noteProject.createdAt,
        })
        .from(noteProject)
        .where(
          and(
            eq(noteProject.slug, slug),
            eq(noteProject.isPublic, true),
            eq(noteProject.status, 'completed')
          )
        )
        .limit(1);

      if (notes.length === 0) {
        return { success: false, error: 'Note not found' };
      }

      const note = notes[0];

      // 获取所有卡片
      const cards = await db
        .select({
          id: noteCard.id,
          order: noteCard.order,
          imageUrl: noteCard.imageUrl,
          originalText: noteCard.originalText,
        })
        .from(noteCard)
        .where(
          and(
            eq(noteCard.projectId, note.id),
            eq(noteCard.status, 'completed')
          )
        )
        .orderBy(noteCard.order);

      // 增加浏览次数
      await db
        .update(noteProject)
        .set({ views: sql`${noteProject.views} + 1` })
        .where(eq(noteProject.id, note.id));

      return {
        success: true,
        note: {
          ...note,
          tagsArray: note.tags ? note.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          cards,
        },
      };
    } catch (error) {
      console.error('Get note by slug error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get note',
      };
    }
  });

/**
 * 获取热门标签
 */
export const getPopularTagsAction = publicActionClient
  .action(async () => {
    try {
      const db = await getDb();

      // 获取所有公开笔记的标签
      const notes = await db
        .select({ tags: noteProject.tags })
        .from(noteProject)
        .where(
          and(
            eq(noteProject.isPublic, true),
            eq(noteProject.status, 'completed'),
            isNotNull(noteProject.tags)
          )
        );

      // 统计标签频率
      const tagCount: Record<string, number> = {};
      for (const note of notes) {
        if (note.tags) {
          const tags = note.tags.split(',').map(t => t.trim()).filter(Boolean);
          for (const tag of tags) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        }
      }

      // 排序并取前20个
      const popularTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));

      return {
        success: true,
        tags: popularTags,
      };
    } catch (error) {
      console.error('Get popular tags error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tags',
      };
    }
  });

// ============================================================
// 用户 Actions（需要登录）
// ============================================================

/**
 * 分享笔记到广场
 */
export const shareToPlazaAction = userActionClient
  .schema(shareToPlazaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, title, description, tags } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 验证项目存在且属于当前用户
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.id, projectId))
        .limit(1);

      if (projects.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      const project = projects[0];

      if (project.userId !== currentUser.id) {
        return { success: false, error: 'Unauthorized' };
      }

      if (project.status !== 'completed') {
        return { success: false, error: 'Only completed projects can be shared' };
      }

      if (project.isPublic) {
        return { success: false, error: 'Project is already public' };
      }

      // 生成 slug
      const slug = generateSlug(title);

      // 更新项目
      await db
        .update(noteProject)
        .set({
          isPublic: true,
          title,
          description: description || null,
          tags: tags || null,
          slug,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return {
        success: true,
        slug,
        message: '笔记已分享到广场',
      };
    } catch (error) {
      console.error('Share to plaza error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share',
      };
    }
  });

/**
 * 从广场移除笔记
 */
export const removeFromPlazaAction = userActionClient
  .schema(removeFromPlazaSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 验证项目存在且属于当前用户
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

      // 更新项目
      await db
        .update(noteProject)
        .set({
          isPublic: false,
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return {
        success: true,
        message: '笔记已从广场移除',
      };
    } catch (error) {
      console.error('Remove from plaza error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove',
      };
    }
  });

// ============================================================
// 管理员 Actions
// ============================================================

/**
 * 设置精选笔记
 */
export const setFeaturedAction = adminActionClient
  .schema(z.object({
    projectId: z.string(),
    isFeatured: z.boolean(),
  }))
  .action(async ({ parsedInput }) => {
    const { projectId, isFeatured } = parsedInput;

    try {
      const db = await getDb();

      await db
        .update(noteProject)
        .set({
          isFeatured,
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return {
        success: true,
        message: isFeatured ? '已设为精选' : '已取消精选',
      };
    } catch (error) {
      console.error('Set featured error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update',
      };
    }
  });

/**
 * 管理员强制下架笔记
 */
export const adminRemoveNoteAction = adminActionClient
  .schema(z.object({
    projectId: z.string(),
  }))
  .action(async ({ parsedInput }) => {
    const { projectId } = parsedInput;

    try {
      const db = await getDb();

      await db
        .update(noteProject)
        .set({
          isPublic: false,
          isFeatured: false,
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return {
        success: true,
        message: '笔记已下架',
      };
    } catch (error) {
      console.error('Admin remove note error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove',
      };
    }
  });

/**
 * 获取广场管理列表（管理员用）
 */
export const getAdminPlazaNotesAction = adminActionClient
  .schema(z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    status: z.enum(['all', 'public', 'featured']).default('all'),
  }))
  .action(async ({ parsedInput }) => {
    const { page, limit, status } = parsedInput;
    const offset = (page - 1) * limit;

    try {
      const db = await getDb();

      // 构建查询条件
      const conditions = [eq(noteProject.status, 'completed')];

      if (status === 'public') {
        conditions.push(eq(noteProject.isPublic, true));
      } else if (status === 'featured') {
        conditions.push(eq(noteProject.isPublic, true));
        conditions.push(eq(noteProject.isFeatured, true));
      }

      // 查询笔记
      const notes = await db
        .select({
          id: noteProject.id,
          userId: noteProject.userId,
          title: noteProject.title,
          slug: noteProject.slug,
          visualStyle: noteProject.visualStyle,
          tags: noteProject.tags,
          views: noteProject.views,
          likes: noteProject.likes,
          isPublic: noteProject.isPublic,
          isFeatured: noteProject.isFeatured,
          publishedAt: noteProject.publishedAt,
          createdAt: noteProject.createdAt,
        })
        .from(noteProject)
        .where(and(...conditions))
        .orderBy(desc(noteProject.createdAt))
        .limit(limit)
        .offset(offset);

      // 获取总数
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(noteProject)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        notes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get admin plaza notes error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notes',
      };
    }
  });
