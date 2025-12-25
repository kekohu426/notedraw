/**
 * SEO 配置文件
 * 集中管理所有 SEO 相关的配置项
 */

export const seoConfig = {
  // ============================================================
  // 基础信息
  // ============================================================
  brand: {
    name: 'NoteDraw',
    tagline: 'AI Visual Note Generator',
  },

  // ============================================================
  // 索引控制规则
  // ============================================================
  indexing: {
    /**
     * 聚合页（如标签页、搜索结果页）的最少条目数
     * 低于此数量的页面会被标记为 noindex，避免空页面被收录
     */
    minItemsForAggregationPage: 5,

    /**
     * 分页的最大收录页数
     * 超过此页数的分页会被标记为 noindex，防止爬虫陷阱
     * 设为 0 表示不限制
     */
    maxPaginationPages: 50,

    /**
     * 笔记项目可被索引的状态列表
     */
    indexableProjectStatuses: ['completed'] as const,
  },

  // ============================================================
  // JSON-LD 结构化数据
  // ============================================================
  jsonLd: {
    /**
     * 组织信息（用于 Organization schema）
     */
    organization: {
      name: 'NoteDraw',
      logo: '/logo.png',
    },

    /**
     * 软件应用信息（用于 SoftwareApplication schema）
     */
    softwareApplication: {
      name: 'NoteDraw',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web',
      offers: {
        price: '0',
        priceCurrency: 'USD',
      },
    },
  },

  // ============================================================
  // Open Graph 配置
  // ============================================================
  openGraph: {
    defaultImage: '/og.png',
    imageWidth: 1200,
    imageHeight: 630,
  },

  // ============================================================
  // 敏感词配置（预留，暂不启用）
  // ============================================================
  sensitiveWords: {
    enabled: false,
    words: [] as string[],
  },
} as const;

// 类型导出
export type SeoConfig = typeof seoConfig;
