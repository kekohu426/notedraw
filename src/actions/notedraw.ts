'use server';

import { getDb } from '@/db';
import { noteProject, noteCard } from '@/db/schema';
import { userActionClient } from '@/lib/safe-action';
import type { User } from '@/lib/auth-types';
import { consumeCredits, hasEnoughCredits } from '@/credits/credits';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, desc } from 'drizzle-orm';
import {
  generate,
  regenerateUnit,
  type VisualStyle,
  type Language,
  type GenerateMode,
  type NoteUnit,
  type AIConfig,
} from '@/ai/notedraw';

// Credit 消耗配置
const CREDITS_FOR_ANALYSIS = 1;
const CREDITS_FOR_IMAGE = 5;

// ============================================================
// Schema 定义
// ============================================================

// 自定义供应商配置 Schema
const customProviderSchema = z.object({
  name: z.string(),
  baseUrl: z.string().url(),
  apiKey: z.string(),
  model: z.string().optional(),
}).optional();

// AI 配置 Schema
const aiConfigSchema = z.object({
  apiProvider: z.enum(['gemini', 'apimart', 'fal', 'replicate', 'openai', 'custom']).default('gemini'),
  imageModel: z.enum(['gemini-2.0-flash-preview-image-generation', 'gpt-4o-image', 'gemini-3-pro-image-preview', 'flux-pro', 'dall-e-3']).default('gemini-2.0-flash-preview-image-generation'),
  textModel: z.enum(['gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'glm-4-flash']).default('glm-4-flash'),
  usePlaceholder: z.boolean().optional(),
  customProvider: customProviderSchema,
}).optional();

import { TEXT_LIMITS } from '@/config/notedraw';

const createProjectSchema = z.object({
  inputText: z.string().min(TEXT_LIMITS.MIN_INPUT_LENGTH).max(TEXT_LIMITS.MAX_INPUT_LENGTH),
  language: z.enum(['en', 'zh']).default('en'),
  visualStyle: z.enum(['sketch', 'business', 'cute', 'minimal', 'chalkboard']).default('sketch'),
  generateMode: z.enum(['compact', 'detailed']).default('detailed'),
  signature: z.string().max(50).optional(),
  aiConfig: aiConfigSchema,
});

const generateNotesSchema = z.object({
  projectId: z.string(),
  aiConfig: aiConfigSchema,
});

const regenerateCardSchema = z.object({
  cardId: z.string(),
  aiConfig: aiConfigSchema,
});

const regenerateWithPromptSchema = z.object({
  cardId: z.string(),
  customPrompt: z.string().min(1).max(2000),
  aiConfig: aiConfigSchema,
});

const getProjectSchema = z.object({
  projectId: z.string(),
});

// ============================================================
// Actions
// ============================================================

/**
 * 创建新项目
 */
export const createProjectAction = userActionClient
  .schema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { inputText, language, visualStyle, generateMode, signature } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    console.log('🟢 createProjectAction called:', {
      userId: currentUser.id,
      inputTextLength: inputText.length,
      language,
      visualStyle,
      generateMode,
    });

    try {
      const db = await getDb();
      const projectId = nanoid();

      console.log('🟢 Inserting project:', { projectId, userId: currentUser.id });

      await db.insert(noteProject).values({
        id: projectId,
        userId: currentUser.id,
        inputText,
        language,
        visualStyle,
        generateMode,
        signature: signature || '娇姐手绘整理',
        status: 'draft',
      });

      console.log('🟢 Project created successfully:', projectId);

      return {
        success: true,
        projectId,
      };
    } catch (error) {
      console.error('🔴 Create project error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      };
    }
  });

/**
 * 生成视觉笔记（主流程）
 */
export const generateNotesAction = userActionClient
  .schema(generateNotesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, aiConfig } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取项目
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.id, projectId))
        .limit(1);

      if (projects.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      const project = projects[0];

      // 验证项目所有权
      if (project.userId !== currentUser.id) {
        return { success: false, error: 'Unauthorized' };
      }

      // 内测阶段暂时跳过积分检查
      // const estimatedCredits = CREDITS_FOR_ANALYSIS + CREDITS_FOR_IMAGE;
      // const hasCredits = await hasEnoughCredits({ userId: currentUser.id, requiredCredits: estimatedCredits });
      // if (!hasCredits) {
      //   return { success: false, error: 'Insufficient credits' };
      // }

      // 更新项目状态
      await db
        .update(noteProject)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(noteProject.id, projectId));

      // 内测阶段暂时跳过积分消耗
      // await consumeCredits({
      //   userId: currentUser.id,
      //   amount: CREDITS_FOR_ANALYSIS,
      //   description: 'NoteDraw: Content analysis',
      // });

      // 调用 AI 生成
      const units = await generate({
        inputText: project.inputText,
        language: project.language as Language,
        visualStyle: project.visualStyle as VisualStyle,
        generateMode: project.generateMode as GenerateMode,
        aiConfig: aiConfig as AIConfig | undefined,
        signature: project.signature || undefined,
      });

      // 保存卡片到数据库
      const cardPromises = units.map(async (unit, index) => {
        const cardId = nanoid();

        // 内测阶段暂时跳过积分消耗
        // if (unit.status === 'completed') {
        //   await consumeCredits({
        //     userId: currentUser.id,
        //     amount: CREDITS_FOR_IMAGE,
        //     description: `NoteDraw: Image generation (${index + 1})`,
        //   });
        // }

        await db.insert(noteCard).values({
          id: cardId,
          projectId,
          order: unit.order,
          originalText: unit.originalText,
          structure: unit.structure ? JSON.stringify(unit.structure) : null,
          prompt: unit.prompt,
          imageUrl: unit.imageUrl,
          status: unit.status,
          errorMessage: unit.errorMessage,
        });

        return { ...unit, id: cardId };
      });

      const savedCards = await Promise.all(cardPromises);

      // 更新项目状态
      const allCompleted = savedCards.every(c => c.status === 'completed');
      const anyFailed = savedCards.some(c => c.status === 'failed');

      await db
        .update(noteProject)
        .set({
          status: allCompleted ? 'completed' : anyFailed ? 'failed' : 'completed',
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return {
        success: true,
        cards: savedCards,
      };
    } catch (error) {
      console.error('Generate notes error:', error);

      // 更新项目状态为失败
      const db = await getDb();
      await db
        .update(noteProject)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(noteProject.id, projectId));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate notes',
      };
    }
  });

/**
 * 重新生成单张卡片
 */
export const regenerateCardAction = userActionClient
  .schema(regenerateCardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { cardId, aiConfig } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取卡片和项目信息
      const cards = await db
        .select()
        .from(noteCard)
        .where(eq(noteCard.id, cardId))
        .limit(1);

      if (cards.length === 0) {
        return { success: false, error: 'Card not found' };
      }

      const card = cards[0];

      // 获取项目验证所有权
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.id, card.projectId))
        .limit(1);

      if (projects.length === 0 || projects[0].userId !== currentUser.id) {
        return { success: false, error: 'Unauthorized' };
      }

      const project = projects[0];

      // 内测阶段暂时跳过积分检查
      // const hasCredits = await hasEnoughCredits({ userId: currentUser.id, requiredCredits: CREDITS_FOR_IMAGE });
      // if (!hasCredits) {
      //   return { success: false, error: 'Insufficient credits' };
      // }

      // 构建 NoteUnit
      const unit: NoteUnit = {
        id: card.id,
        order: card.order,
        originalText: card.originalText || '',
        structure: card.structure ? JSON.parse(card.structure) : undefined,
        prompt: card.prompt || undefined,
        imageUrl: card.imageUrl || undefined,
        status: card.status as NoteUnit['status'],
      };

      // 重新生成
      const updatedUnit = await regenerateUnit(
        unit,
        project.visualStyle as VisualStyle,
        project.language as Language,
        aiConfig as AIConfig | undefined
      );

      // 更新数据库
      await db
        .update(noteCard)
        .set({
          prompt: updatedUnit.prompt,
          imageUrl: updatedUnit.imageUrl,
          status: updatedUnit.status,
          errorMessage: updatedUnit.errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(noteCard.id, cardId));

      // 内测阶段暂时跳过积分消耗
      // if (updatedUnit.status === 'completed') {
      //   await consumeCredits({
      //     userId: currentUser.id,
      //     amount: CREDITS_FOR_IMAGE,
      //     description: 'NoteDraw: Image regeneration',
      //   });
      // }

      return {
        success: true,
        card: updatedUnit,
      };
    } catch (error) {
      console.error('Regenerate card error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate card',
      };
    }
  });

/**
 * 使用自定义 Prompt 重新生成卡片
 */
export const regenerateWithPromptAction = userActionClient
  .schema(regenerateWithPromptSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { cardId, customPrompt, aiConfig } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取卡片和项目信息
      const cards = await db
        .select()
        .from(noteCard)
        .where(eq(noteCard.id, cardId))
        .limit(1);

      if (cards.length === 0) {
        return { success: false, error: 'Card not found' };
      }

      const card = cards[0];

      // 获取项目验证所有权
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.id, card.projectId))
        .limit(1);

      if (projects.length === 0 || projects[0].userId !== currentUser.id) {
        return { success: false, error: 'Unauthorized' };
      }

      const project = projects[0];

      // 内测阶段暂时跳过积分检查
      // const hasCredits = await hasEnoughCredits({ userId: currentUser.id, requiredCredits: CREDITS_FOR_IMAGE });
      // if (!hasCredits) {
      //   return { success: false, error: 'Insufficient credits' };
      // }

      // 直接使用自定义 prompt 调用 paint
      const { paint } = await import('@/ai/notedraw/painter');

      const paintResult = await paint({
        prompt: customPrompt,
        width: 1024,
        height: 768,
        imageModel: aiConfig?.imageModel,
        apiProvider: aiConfig?.apiProvider,
        customProvider: aiConfig?.customProvider,
      });

      // 更新数据库
      const newStatus = paintResult.success ? 'completed' : 'failed';
      await db
        .update(noteCard)
        .set({
          prompt: customPrompt,
          imageUrl: paintResult.imageUrl,
          status: newStatus,
          errorMessage: paintResult.errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(noteCard.id, cardId));

      // 内测阶段暂时跳过积分消耗
      // if (paintResult.success) {
      //   await consumeCredits({
      //     userId: currentUser.id,
      //     amount: CREDITS_FOR_IMAGE,
      //     description: 'NoteDraw: Custom prompt regeneration',
      //   });
      // }

      return {
        success: true,
        card: {
          id: cardId,
          prompt: customPrompt,
          imageUrl: paintResult.imageUrl,
          status: newStatus,
          errorMessage: paintResult.errorMessage,
        },
      };
    } catch (error) {
      console.error('Regenerate with prompt error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate card',
      };
    }
  });

/**
 * 获取项目详情
 */
export const getProjectAction = userActionClient
  .schema(getProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取项目
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.id, projectId))
        .limit(1);

      if (projects.length === 0) {
        return { success: false, error: 'Project not found' };
      }

      const project = projects[0];

      // 验证所有权
      if (project.userId !== currentUser.id) {
        return { success: false, error: 'Unauthorized' };
      }

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
          cards: cards.map(card => ({
            ...card,
            structure: card.structure ? JSON.parse(card.structure) : null,
          })),
        },
      };
    } catch (error) {
      console.error('Get project error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project',
      };
    }
  });

/**
 * 获取用户的所有项目
 */
export const getUserProjectsAction = userActionClient
  .action(async ({ ctx }) => {
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取项目列表
      const projects = await db
        .select()
        .from(noteProject)
        .where(eq(noteProject.userId, currentUser.id))
        .orderBy(desc(noteProject.createdAt));

      // 获取每个项目的卡片
      const projectsWithCards = await Promise.all(
        projects.map(async (project) => {
          const cards = await db
            .select({
              id: noteCard.id,
              imageUrl: noteCard.imageUrl,
              prompt: noteCard.prompt,
              originalText: noteCard.originalText,
              status: noteCard.status,
              order: noteCard.order,
              errorMessage: noteCard.errorMessage,
            })
            .from(noteCard)
            .where(eq(noteCard.projectId, project.id))
            .orderBy(noteCard.order);

          return {
            ...project,
            cards,
            _count: {
              cards: cards.length,
            },
          };
        })
      );

      return {
        success: true,
        projects: projectsWithCards,
      };
    } catch (error) {
      console.error('Get user projects error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get projects',
      };
    }
  });

const deleteProjectSchema = z.object({
  projectId: z.string(),
});

const fetchUrlContentSchema = z.object({
  url: z.string().url(),
});

/**
 * 删除项目
 */
export const deleteProjectAction = userActionClient
  .schema(deleteProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取项目验证所有权
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

      // 删除项目（卡片会因为外键级联删除）
      await db
        .delete(noteProject)
        .where(eq(noteProject.id, projectId));

      return {
        success: true,
      };
    } catch (error) {
      console.error('Delete project error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete project',
      };
    }
  });

/**
 * 从 URL 获取内容
 */
export const fetchUrlContentAction = userActionClient
  .schema(fetchUrlContentSchema)
  .action(async ({ parsedInput }) => {
    const { url } = parsedInput;

    try {
      // 使用 fetch 获取网页内容
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NoteDraw/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000), // 10 秒超时
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';

      // 检查是否是 HTML
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return {
          success: false,
          error: 'URL must point to an HTML or text page',
        };
      }

      const html = await response.text();

      // 简单的 HTML 文本提取
      let text = html
        // 移除 script 和 style 标签及其内容
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // 移除 HTML 注释
        .replace(/<!--[\s\S]*?-->/g, '')
        // 移除所有 HTML 标签
        .replace(/<[^>]+>/g, ' ')
        // 解码 HTML 实体
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        // 清理多余空白
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // 截断过长的内容
      if (text.length > TEXT_LIMITS.MAX_URL_CONTENT_LENGTH) {
        text = text.slice(0, TEXT_LIMITS.MAX_URL_CONTENT_LENGTH);
      }

      if (!text || text.length < TEXT_LIMITS.MIN_INPUT_LENGTH) {
        return {
          success: false,
          error: 'Could not extract meaningful content from the URL',
        };
      }

      return {
        success: true,
        content: text,
        truncated: html.length > TEXT_LIMITS.MAX_URL_CONTENT_LENGTH,
      };
    } catch (error) {
      console.error('Fetch URL content error:', error);

      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          return { success: false, error: 'Request timed out' };
        }
        if (error.message.includes('fetch')) {
          return { success: false, error: 'Failed to connect to URL' };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch URL content',
      };
    }
  });
