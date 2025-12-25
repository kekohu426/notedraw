/**
 * 智能索引控制
 * 判断页面是否应该被搜索引擎收录
 */

import { seoConfig } from '@/config/seo.config';

/**
 * 页面类型
 */
export type PageType =
  | 'static'           // 静态页面（首页、关于页等）
  | 'blog-post'        // 博客文章
  | 'note-detail'      // 笔记详情页
  | 'aggregation'      // 聚合页（标签页、分类页等）
  | 'pagination'       // 分页页面
  | 'search';          // 搜索结果页

/**
 * 页面上下文信息
 */
export interface PageContext {
  /** 页面类型 */
  type: PageType;

  /** 笔记项目状态（仅 note-detail 类型需要） */
  projectStatus?: string;

  /** 是否公开（仅 note-detail 类型需要） */
  isPublic?: boolean;

  /** 聚合页的条目数量（仅 aggregation/search 类型需要） */
  itemCount?: number;

  /** 当前页码（仅 pagination 类型需要） */
  pageNumber?: number;

  /** 博客文章是否已发布（仅 blog-post 类型需要） */
  isPublished?: boolean;
}

/**
 * 判断页面是否应该被索引
 *
 * @param context 页面上下文信息
 * @returns true = 应该索引, false = 不应该索引 (noindex)
 *
 * @example
 * // 静态页面 - 始终索引
 * isIndexable({ type: 'static' }) // true
 *
 * // 笔记详情页 - 检查状态和公开性
 * isIndexable({ type: 'note-detail', projectStatus: 'completed', isPublic: true }) // true
 * isIndexable({ type: 'note-detail', projectStatus: 'draft', isPublic: true }) // false
 *
 * // 聚合页 - 检查条目数
 * isIndexable({ type: 'aggregation', itemCount: 10 }) // true
 * isIndexable({ type: 'aggregation', itemCount: 2 }) // false
 */
export function isIndexable(context: PageContext): boolean {
  const { indexing } = seoConfig;

  switch (context.type) {
    // 静态页面：始终索引
    case 'static':
      return true;

    // 博客文章：只有已发布的才索引
    case 'blog-post':
      return context.isPublished !== false;

    // 笔记详情页：必须是已完成且公开的
    case 'note-detail': {
      const hasValidStatus = indexing.indexableProjectStatuses.includes(
        context.projectStatus as typeof indexing.indexableProjectStatuses[number]
      );
      const isPublic = context.isPublic === true;
      return hasValidStatus && isPublic;
    }

    // 聚合页：条目数必须达到阈值
    case 'aggregation': {
      const itemCount = context.itemCount ?? 0;
      return itemCount >= indexing.minItemsForAggregationPage;
    }

    // 搜索结果页：条目数必须达到阈值
    case 'search': {
      const itemCount = context.itemCount ?? 0;
      return itemCount >= indexing.minItemsForAggregationPage;
    }

    // 分页：检查页码限制
    case 'pagination': {
      const maxPages = indexing.maxPaginationPages;
      // 如果 maxPages 为 0，表示不限制
      if (maxPages === 0) return true;
      const pageNumber = context.pageNumber ?? 1;
      return pageNumber <= maxPages;
    }

    default:
      // 未知类型默认索引
      return true;
  }
}

/**
 * 获取 robots meta 标签值
 *
 * @param context 页面上下文信息
 * @returns robots 配置对象，可直接用于 Next.js Metadata
 */
export function getRobotsConfig(context: PageContext): {
  index: boolean;
  follow: boolean;
} {
  const shouldIndex = isIndexable(context);

  return {
    index: shouldIndex,
    // 即使不索引，也允许跟踪链接（有助于发现新页面）
    follow: true,
  };
}
