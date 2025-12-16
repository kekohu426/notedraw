'use server';

import { adminActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { writeFile, readdir } from 'fs/promises';
import { join } from 'path';

// GLM API 配置
const GLM_API_KEY = process.env.GLM_API_KEY;
const GLM_BASE_URL = process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const TEXT_MODEL = 'glm-4-flash';

// 博客内容目录
const BLOG_CONTENT_DIR = join(process.cwd(), 'content', 'blog');

// ============================================================
// Schema 定义
// ============================================================

const generateBlogSchema = z.object({
  topic: z.string().min(1).max(200),
  categories: z.array(z.string()).default(['product']),
  language: z.enum(['zh', 'en', 'both']).default('both'),
  style: z.enum(['professional', 'casual', 'tutorial']).default('casual'),
  keywords: z.array(z.string()).optional(),
});

const listBlogsSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * 调用 GLM API
 */
async function callGLM(prompt: string): Promise<string> {
  if (!GLM_API_KEY) {
    throw new Error('GLM_API_KEY is not set');
  }

  const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 生成博客内容的 Prompt
 */
function getBlogPrompt(
  topic: string,
  language: 'zh' | 'en',
  style: 'professional' | 'casual' | 'tutorial',
  keywords?: string[]
): string {
  const isZh = language === 'zh';

  const styleGuide = {
    professional: isZh
      ? '专业、权威、数据驱动、引用研究'
      : 'Professional, authoritative, data-driven, citing research',
    casual: isZh
      ? '轻松、友好、易读、使用比喻和例子'
      : 'Casual, friendly, easy to read, using metaphors and examples',
    tutorial: isZh
      ? '教程式、步骤清晰、包含代码示例或操作指南'
      : 'Tutorial style, clear steps, including code examples or how-to guides',
  };

  const keywordsSection = keywords?.length
    ? (isZh
        ? `\n关键词要自然融入文章: ${keywords.join(', ')}`
        : `\nNaturally incorporate these keywords: ${keywords.join(', ')}`)
    : '';

  return `
${isZh ? '你是一位专业的技术博客作者，为 NoteDraw（AI视觉笔记生成工具）撰写博客文章。' : 'You are a professional tech blog writer for NoteDraw (an AI visual note generation tool).'}

${isZh ? '## 写作任务' : '## Writing Task'}
${isZh ? '主题' : 'Topic'}: ${topic}
${isZh ? '写作风格' : 'Style'}: ${styleGuide[style]}
${keywordsSection}

${isZh ? '## 输出要求' : '## Output Requirements'}
${isZh ? `
1. 文章长度：800-1500字
2. 包含标题、引言、2-4个主要章节、结论
3. 使用 Markdown 格式（## 标题，**加粗**，- 列表）
4. 适当使用 emoji 增加趣味性
5. 在适当位置提及 NoteDraw 的功能
6. 结尾包含 CTA（号召用户尝试 NoteDraw）
` : `
1. Article length: 800-1500 words
2. Include title, intro, 2-4 main sections, conclusion
3. Use Markdown format (## headings, **bold**, - lists)
4. Use emojis appropriately for engagement
5. Mention NoteDraw features where appropriate
6. End with a CTA (encourage users to try NoteDraw)
`}

${isZh ? '## 格式要求' : '## Format'}
${isZh ? `
直接输出文章内容，不要有任何前缀说明。
第一行必须是 ## 开头的标题。
` : `
Output article content directly, no prefix explanations.
First line must be a ## heading title.
`}
`;
}

/**
 * 生成文件名（slug）
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * 从生成的内容中提取标题
 */
function extractTitle(content: string): string {
  const match = content.match(/^##\s*(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * 生成 MDX frontmatter
 */
function generateFrontmatter(
  title: string,
  description: string,
  categories: string[],
  author: string = 'notedraw'
): string {
  const date = new Date().toISOString().split('T')[0];
  return `---
title: "${title}"
description: "${description}"
image: /images/blog/post-1.png
date: "${date}"
published: true
categories: [${categories.join(', ')}]
author: ${author}
---

`;
}

/**
 * 生成描述（从内容提取前150字）
 */
function generateDescription(content: string): string {
  // 移除标题行和空行
  const text = content
    .replace(/^##.*$/gm, '')
    .replace(/\n+/g, ' ')
    .trim();

  return text.slice(0, 150).trim() + '...';
}

// ============================================================
// Actions
// ============================================================

/**
 * AI 生成博客文章
 */
export const generateBlogAction = adminActionClient
  .schema(generateBlogSchema)
  .action(async ({ parsedInput }) => {
    const { topic, categories, language, style, keywords } = parsedInput;

    try {
      const results: { language: string; slug: string; title: string }[] = [];

      // 根据语言设置生成文章
      const languages = language === 'both' ? ['en', 'zh'] as const : [language] as const;

      for (const lang of languages) {
        // 生成文章内容
        const prompt = getBlogPrompt(topic, lang, style, keywords);
        const content = await callGLM(prompt);

        // 提取标题和描述
        const title = extractTitle(content);
        const description = generateDescription(content);
        const slug = generateSlug(title);

        // 生成完整的 MDX 文件内容
        const frontmatter = generateFrontmatter(title, description, categories);
        const mdxContent = frontmatter + content;

        // 文件名：英文用 slug.mdx，中文用 slug.zh.mdx
        const fileName = lang === 'zh' ? `${slug}.zh.mdx` : `${slug}.mdx`;
        const filePath = join(BLOG_CONTENT_DIR, fileName);

        // 写入文件
        await writeFile(filePath, mdxContent, 'utf-8');

        results.push({ language: lang, slug, title });
      }

      return {
        success: true,
        articles: results,
        message: `Successfully generated ${results.length} article(s)`,
      };

    } catch (error) {
      console.error('Blog generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate blog',
      };
    }
  });

/**
 * 获取博客文章列表
 */
export const listBlogsAction = adminActionClient
  .schema(listBlogsSchema)
  .action(async ({ parsedInput }) => {
    const { page, pageSize } = parsedInput;

    try {
      const files = await readdir(BLOG_CONTENT_DIR);

      // 过滤 .mdx 文件，排除 .zh.mdx（避免重复）
      const mdxFiles = files
        .filter(f => f.endsWith('.mdx') && !f.endsWith('.zh.mdx'))
        .sort()
        .reverse(); // 最新的在前面

      const total = mdxFiles.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageFiles = mdxFiles.slice(start, end);

      // 返回文件名列表（可以后续扩展读取 frontmatter）
      const blogs = pageFiles.map(file => ({
        slug: file.replace('.mdx', ''),
        hasZh: files.includes(file.replace('.mdx', '.zh.mdx')),
      }));

      return {
        success: true,
        blogs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };

    } catch (error) {
      console.error('List blogs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list blogs',
      };
    }
  });
