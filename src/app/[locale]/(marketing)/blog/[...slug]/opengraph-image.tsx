/**
 * 博客文章动态 OG 图片
 * 自动为每篇文章生成社交分享预览图
 */

import { generateOGImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from '@/lib/seo/og-image';
import { blogSource } from '@/lib/source';
import type { Locale } from 'next-intl';

export const runtime = 'edge';
export const alt = 'Blog Post';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

interface Props {
  params: Promise<{
    locale: Locale;
    slug: string[];
  }>;
}

export default async function Image({ params }: Props) {
  const { locale, slug } = await params;
  const post = blogSource.getPage(slug, locale);

  if (!post) {
    // Fallback to default OG image
    return generateOGImage({
      title: 'Blog',
      type: 'blog',
    });
  }

  return generateOGImage({
    title: post.data.title,
    subtitle: post.data.description,
    type: 'blog',
  });
}
