/**
 * SeoHead 组件
 * 封装 SEO 相关的结构化数据（JSON-LD）
 *
 * 注意：Next.js 的 title/description 等元数据应该通过 generateMetadata 函数设置
 * 此组件主要用于注入 JSON-LD 结构化数据
 *
 * @example
 * // 在页面中使用
 * <SeoHead
 *   jsonLd={{
 *     type: 'Article',
 *     title: '文章标题',
 *     description: '文章描述',
 *     image: '/og.png',
 *     datePublished: '2024-01-01',
 *   }}
 * />
 */

import { seoConfig } from '@/config/seo.config';
import { getBaseUrl, getImageUrl } from '@/lib/urls/urls';

// ============================================================
// JSON-LD 类型定义
// ============================================================

interface ArticleJsonLd {
  type: 'Article';
  title: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  authorUrl?: string;
}

interface SoftwareApplicationJsonLd {
  type: 'SoftwareApplication';
  name?: string;
  description?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  price?: string;
  priceCurrency?: string;
  ratingValue?: number;
  ratingCount?: number;
}

interface ProductJsonLd {
  type: 'Product';
  name: string;
  description?: string;
  image?: string;
  price?: string;
  priceCurrency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

interface OrganizationJsonLd {
  type: 'Organization';
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

interface BreadcrumbJsonLd {
  type: 'BreadcrumbList';
  items: Array<{
    name: string;
    url: string;
  }>;
}

type JsonLdData =
  | ArticleJsonLd
  | SoftwareApplicationJsonLd
  | ProductJsonLd
  | OrganizationJsonLd
  | BreadcrumbJsonLd;

interface SeoHeadProps {
  jsonLd?: JsonLdData | JsonLdData[];
}

// ============================================================
// JSON-LD 生成函数
// ============================================================

function generateJsonLd(data: JsonLdData): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  const { brand, jsonLd: jsonLdConfig } = seoConfig;

  switch (data.type) {
    case 'Article':
      return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.description,
        image: data.image ? getImageUrl(data.image) : undefined,
        datePublished: data.datePublished,
        dateModified: data.dateModified || data.datePublished,
        author: {
          '@type': 'Person',
          name: data.authorName || brand.name,
          ...(data.authorUrl && { url: data.authorUrl }),
        },
        publisher: {
          '@type': 'Organization',
          name: brand.name,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}${jsonLdConfig.organization.logo}`,
          },
        },
      };

    case 'SoftwareApplication':
      return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: data.name || jsonLdConfig.softwareApplication.name,
        description: data.description,
        applicationCategory:
          data.applicationCategory ||
          jsonLdConfig.softwareApplication.applicationCategory,
        operatingSystem:
          data.operatingSystem ||
          jsonLdConfig.softwareApplication.operatingSystem,
        offers: {
          '@type': 'Offer',
          price: data.price || jsonLdConfig.softwareApplication.offers.price,
          priceCurrency:
            data.priceCurrency ||
            jsonLdConfig.softwareApplication.offers.priceCurrency,
        },
        ...(data.ratingValue && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: data.ratingValue,
            ratingCount: data.ratingCount || 1,
          },
        }),
      };

    case 'Product':
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.name,
        description: data.description,
        image: data.image ? getImageUrl(data.image) : undefined,
        offers: {
          '@type': 'Offer',
          price: data.price,
          priceCurrency: data.priceCurrency || 'USD',
          availability: data.availability
            ? `https://schema.org/${data.availability}`
            : 'https://schema.org/InStock',
        },
      };

    case 'Organization':
      return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.name || brand.name,
        url: data.url || baseUrl,
        logo: data.logo
          ? getImageUrl(data.logo)
          : `${baseUrl}${jsonLdConfig.organization.logo}`,
        sameAs: data.sameAs || [],
      };

    case 'BreadcrumbList':
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: data.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
        })),
      };

    default:
      return {};
  }
}

// ============================================================
// 组件
// ============================================================

export function SeoHead({ jsonLd }: SeoHeadProps) {
  if (!jsonLd) return null;

  const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return (
    <>
      {jsonLdArray.map((data, index) => (
        <script
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateJsonLd(data)),
          }}
        />
      ))}
    </>
  );
}

// ============================================================
// 预设 JSON-LD 生成器
// ============================================================

/**
 * 生成首页的 JSON-LD（Organization + SoftwareApplication）
 */
export function getHomePageJsonLd(): JsonLdData[] {
  return [
    { type: 'Organization' },
    { type: 'SoftwareApplication' },
  ];
}

/**
 * 生成文章的 JSON-LD
 */
export function getArticleJsonLd(options: Omit<ArticleJsonLd, 'type'>): ArticleJsonLd {
  return {
    type: 'Article',
    ...options,
  };
}

/**
 * 生成面包屑的 JSON-LD
 */
export function getBreadcrumbJsonLd(
  items: BreadcrumbJsonLd['items']
): BreadcrumbJsonLd {
  return {
    type: 'BreadcrumbList',
    items,
  };
}
